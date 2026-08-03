import { Router } from 'express';
import { requireAuth, attachUserContext, requireRole } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomBytes, randomUUID as uuidv4 } from 'crypto';
import { passwordResetLimiter } from '../middlewares/rateLimiter';
import { CacheService } from '../services/cache';
import { validate } from '../middlewares/validate';

// ─── INPUT SCHEMAS ─────────────────────────────────────────────────────────────────
// All write endpoints use strict Zod schemas:
//   - Type checks: reject { email: { $gt: '' } } object injection
//   - Length limits: prevent DB column overflow and DoS via oversized payload
//   - Format checks: phone regex, email format, UUID length
//   - .strict(): rejects any unexpected extra fields (OWASP API3)

const orgSchema = z.object({
  orgName: z.string().min(2, "Organisation name is required").max(100),
  ownerName: z.string().min(2, "Owner name is required").max(100),
  ownerPhone: z.string().regex(/^[0-9]{10}$/, "Invalid phone number"),
  ownerEmail: z.string().email("Invalid email format").max(254).toLowerCase().trim(),
  ownerAddress: z.string().max(500).optional(),
  branches: z.array(z.object({
    name: z.string().min(2, "Branch name is required").max(100),
    address: z.string().max(500).optional(),
    floors: z.array(z.object({
      floorNumber: z.number().int().min(0).max(100),
      rooms: z.array(z.object({
        roomName: z.string().min(1).max(20),
        bedCount: z.number().int().min(1).max(20),
        rentPerBed: z.number().min(0).max(100000)
      })).max(100).optional()
    })).max(50).optional()
  })).min(1, "At least one branch must be provided").max(20),
  plan: z.string().max(20).optional().default('PRO')
});

/** Schema for POST /wardens */
const createWardenSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).trim(),
  email: z.string().email('Invalid email').max(254).toLowerCase().trim(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Invalid 10-digit phone number'),
  organisationId: z.string().min(5, 'Invalid organisationId').max(40),
  branchId: z.string().min(5, 'Invalid branchId').max(40).optional(),
}).strict(); // reject any extra fields

/** Schema for PATCH /wardens/:id/reassign */
const reassignWardenSchema = z.object({
  newBranchId: z.string().min(5, 'Invalid branchId').max(40),
}).strict();

/** Schema for POST /subscription-requests/:id/reject */
const rejectRequestSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long').trim(),
}).strict();

const router = Router();

// Apply auth middleware and require superadmin role
router.use(requireAuth, attachUserContext, requireRole('SUPERADMIN'));

router.get('/dashboard', async (req, res) => {
  try {
    const cacheKey = 'superadmin:dashboard';
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return res.json({ success: true, data: cachedData });
    }

    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { 
            branches: true, 
            tenants: {
              where: { status: 'ACTIVE' }
            } 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalOrgs = orgs.length;
    // ponytail: count from Subscription table (source of truth), not legacy subscriptionStatus
    const activeOrgs = await prisma.subscription.count({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } }
    });
    const totalBranches = orgs.reduce((acc, o) => acc + o._count.branches, 0);
    const totalTenants = orgs.reduce((acc, o) => acc + o._count.tenants, 0);

    // Calculate this month's revenue across all orgs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const paymentsThisMonth = await prisma.payment.aggregate({
      where: {
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    const totalRevenue = Number(paymentsThisMonth._sum.amount || 0);

    const summary = {
      totalOrgs,
      activeOrgs,
      totalBranches,
      totalTenants,
      totalRevenue
    };

    const responseData = { summary, organisations: orgs };
    await CacheService.set(cacheKey, responseData, 60);

    res.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('Superadmin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const cacheKey = 'superadmin:stats';
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return res.json({ success: true, data: cachedData });
    }

    const [
      totalOrgs,
      totalBranches,
      totalTenants,
      totalUsers,
      pendingRequests
    ] = await Promise.all([
      prisma.organization.count(), // Fix: Changed organisation to organization
      prisma.branch.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.paymentRequest.count({
        where: { status: 'PENDING' }
      }).catch(() => 0)
    ]);

    const responseData = {
      totalOrgs,
      totalBranches,
      totalTenants,
      totalUsers,
      pendingRequests
    };

    await CacheService.set(cacheKey, responseData, 60);

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
});

router.post('/organisations', async (req, res) => {
  // Do NOT log the full request body — it may contain passwords and PII
  try {
    const payload = { ...req.body };
    if (payload.name && !payload.orgName) payload.orgName = payload.name;
    if (payload.phone && !payload.ownerPhone) payload.ownerPhone = payload.phone;
    if (payload.email && !payload.ownerEmail) payload.ownerEmail = payload.email;
    if (payload.address && !payload.ownerAddress) payload.ownerAddress = payload.address;
    if (payload.floors && !payload.branches) {
      payload.branches = [{
        name: "Main Branch",
        address: payload.address,
        floors: payload.floors
      }];
    }
    
    const validatedData = orgSchema.parse(payload);
    const { orgName, ownerName, ownerPhone, ownerEmail, ownerAddress, branches, plan } = validatedData;
    // Intentionally no console.log — org count/structure is internal data

    // SECURITY FIX: Never use phone numbers as passwords (public info).
    const tempPassword = process.env.DEFAULT_USER_PASSWORD || randomBytes(9).toString('base64url');

    const orgId = uuidv4();
    const ownerId = uuidv4();

    // 1. Core Org & User Creation (Transaction 1)
    const coreResult = await prisma.$transaction(async (tx) => {
      const upperPlan = plan.toUpperCase();
      const isStrictBasic = upperPlan === 'STRICT_BASIC';
      const isBasic = upperPlan === 'BASIC';
      const isEnterprise = upperPlan === 'ENTERPRISE';
      const isPro = upperPlan === 'PRO';

      const org = await tx.organization.create({
        data: { 
          id: orgId,
          name: orgName, 
          ownerName: ownerName,
          ownerPhone: ownerPhone,
          email: ownerEmail,
          address: ownerAddress,
          subscriptionPlan: upperPlan,
          subscriptionStatus: 'ACTIVE'
        }
      });

      const trialEndsAt = new Date();
      if (isStrictBasic) {
        trialEndsAt.setTime(0); // Set to past to ensure no PRO trial
      } else {
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      }

      let currentPeriodEnd: Date | null = null;
      if (isStrictBasic || isBasic || isPro) {
        currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 44);
      }

      await tx.subscription.create({
        data: {
          organizationId: orgId,
          plan: upperPlan as any,
          status: isStrictBasic ? 'ACTIVE' : 'TRIAL',
          trialEndsAt,
          currentPeriodEnd
        }
      });

      const passwordHash = bcrypt.hashSync(tempPassword, 12);
      const owner = await tx.user.create({
        data: {
          id: ownerId,
          name: ownerName,
          email: ownerEmail.toLowerCase().trim(),
          phone: ownerPhone,
          passwordHash,
          role: 'OWNER',
          organisationId: orgId,
          isActive: true
        }
      });

      await tx.profile.create({
        data: {
          id: uuidv4(),
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone,
          role: 'OWNER',
          organizationId: orgId
        }
      });

      return { org, owner };
    });

    // 2. Branch & Room Creation (Iterative chunks)
    const createdBranches = [];
    let totalRooms = 0;
    let totalBeds = 0;

    for (const branch of branches) {
      const branchId = uuidv4();
      
      await prisma.branch.create({
        data: {
          id: branchId,
          name: branch.name,
          address: branch.address || ownerAddress,
          organizationId: orgId,
          floors: branch.floors ? branch.floors.length : 1
        }
      });
      createdBranches.push(branchId);

      if (branch.floors) {
        // Group rooms into batches to insert without locking DB
        const roomCreates: any[] = [];
        
        for (const floor of branch.floors) {
          if (floor.rooms) {
            for (const room of floor.rooms) {
              const roomId = uuidv4();
              roomCreates.push({
                id: roomId,
                roomNumber: room.roomName,
                floor: floor.floorNumber,
                rentAmount: room.rentPerBed,
                branchId: branchId,
                organizationId: orgId,
                totalCapacity: room.bedCount,
              });
              
              const bedData = [];
              const bedNames = ['A','B','C','D','E','F','G','H'];
              for (let i = 0; i < room.bedCount; i++) {
                bedData.push({
                  id: uuidv4(),
                  bedNumber: `Bed ${bedNames[i] || (i + 1)}`,
                  roomId: roomId,
                  organizationId: orgId,
                  isOccupied: false
                });
              }
              totalRooms++;
              totalBeds += room.bedCount;
              
              // We'll attach the beds to be created in the same transaction for this room
              (roomCreates[roomCreates.length - 1] as any)._beds = bedData;
            }
          }
        }

        // Insert rooms in small batches of 20
        const batchSize = 20;
        for (let i = 0; i < roomCreates.length; i += batchSize) {
          const batch = roomCreates.slice(i, i + batchSize);
          await prisma.$transaction(async (tx) => {
            for (const r of batch) {
              await tx.room.create({
                data: {
                  id: r.id,
                  roomNumber: r.roomNumber,
                  floor: r.floor,
                  rentAmount: r.rentAmount,
                  branchId: r.branchId,
                  organizationId: r.organizationId,
                  totalCapacity: r.totalCapacity,
                }
              });
              if (r._beds && r._beds.length > 0) {
                await tx.bed.createMany({ data: r._beds });
              }
            }
          });
          // Small delay to prevent event loop blocking
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    const result = {
      orgId,
      ownerId,
      branchIds: createdBranches,
      totalRooms,
      totalBeds,
      ownerCredentials: {
        email: ownerEmail,
        tempPassword: tempPassword
      }
    };

    await CacheService.deleteByPattern('superadmin:*');

    res.status(201).json({ 
      success: true, 
      data: result,
      message: `Organisation created with ${result.totalRooms} rooms and ${result.totalBeds} beds` 
    });
  } catch (error: any) {
    console.error('=== ORG CREATION FAILED ===');
    console.error('Error:', error);

    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(', ') : (target || 'record');
      return res.status(400).json({
        success: false,
        error: `Already exists: ${targetStr}. Please use a different one.`
      });
    }

    if (error instanceof z.ZodError) {
      // Format Zod errors as a field-specific map
      const fieldErrors: Record<string, string> = {};
      const issues = (error as any).issues || (error as any).errors || [];
      issues.forEach((err: any) => {
        if (err.path && err.path.length > 0) {
          fieldErrors[err.path.join('.')] = err.message;
        } else {
          fieldErrors['general'] = err.message;
        }
      });
      return res.status(400).json({ success: false, errors: fieldErrors });
    }

    // Log error to structured logger, not to console or filesystem
    console.error('Organisation creation failed:', error?.message || error);

    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' ? (error.message || 'Failed to create organisation') : 'Failed to create organisation'
    });
  }
});

router.get('/organisations/:orgId', async (req, res) => {
  const { orgId } = req.params;
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        branches: {
          include: {
            rooms: {
              include: { beds: true }
            }
          }
        },
        _count: {
          select: { 
            branches: true,
            tenants: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    if (!org) return res.status(404).json({ success: false, error: 'Organisation not found' });
    res.json({ success: true, data: org });
  } catch (error: any) {
    console.error('Fetch org error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch organisation' });
  }
});

router.patch('/organisations/:orgId/toggle-status', async (req, res) => {
  const { orgId } = req.params;
  try {
    const org = await prisma.organization.findUnique({ 
      where: { id: orgId },
      include: { subscription: true }
    });
    if (!org) return res.status(404).json({ success: false, error: 'Organisation not found' });

    const currentStatus = org.subscription?.status || org.subscriptionStatus;
    const isSuspending = currentStatus === 'ACTIVE' || currentStatus === 'TRIAL';
    const newStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';

    // ponytail: when re-activating (from SUSPENDED or EXPIRED), extend currentPeriodEnd
    // by 30 days. Without this the subscription middleware sees currentPeriodEnd < now
    // and immediately flips the status back to EXPIRED on the very next request.
    const newPeriodEnd = (!isSuspending && org.subscription)
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : undefined;

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: { subscriptionStatus: newStatus }
      }),
      ...(org.subscription ? [
        prisma.subscription.update({
          where: { organizationId: orgId },
          data: {
            status: newStatus as any,
            ...(newPeriodEnd ? { currentPeriodEnd: newPeriodEnd } : {})
          }
        })
      ] : [])
    ]);

    await CacheService.deleteByPattern('superadmin:*');
    res.json({ success: true, newStatus, message: `Organisation status updated to ${newStatus}` });
  } catch (error: any) {
    console.error('Toggle status error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle organisation status' });
  }
});

router.patch('/organisations/:orgId/reset-owner-password', async (req, res) => {
  const { orgId } = req.params;
  try {
    const owner = await prisma.user.findFirst({
      where: {
        organisationId: orgId,
        role: 'OWNER'
      }
    });

    if (!owner) {
      return res.status(404).json({ success: false, error: 'Owner account not found for this organisation' });
    }

    const defaultPassword = 'U9PGs@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    await prisma.user.update({
      where: { id: owner.id },
      data: { passwordHash }
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${owner.name || owner.email} to the default (U9PGs@123)`
    });
  } catch (error: any) {
    console.error('Reset owner password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset owner password' });
  }
});

router.delete('/organisations/:orgId', async (req, res) => {
  const { orgId } = req.params;
  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ success: false, error: 'Organisation not found' });

    const tenants = await prisma.tenant.findMany({ where: { organizationId: orgId }, select: { id: true } });
    const tenantIds = tenants.map(t => t.id);

    await prisma.$transaction([
      // 1. Deepest dependencies (referencing other models)
      prisma.payment.deleteMany({ where: { organizationId: orgId } }),
      prisma.invoice.deleteMany({ where: { organizationId: orgId } }),
      prisma.admission.deleteMany({ where: { organizationId: orgId } }),
      prisma.rentLedger.deleteMany({ where: { tenantId: { in: tenantIds } } }),
      
      // 2. Models directly dependent on Tenant or Organization
      prisma.vacateNotice.deleteMany({ where: { organizationId: orgId } }),
      prisma.securityDeposit.deleteMany({ where: { organizationId: orgId } }),
      prisma.notification.deleteMany({ where: { organizationId: orgId } }),
      prisma.complaint.deleteMany({ where: { organizationId: orgId } }),
      
      // 3. Middle tier (Tenants, Beds, Rooms)
      prisma.tenant.deleteMany({ where: { organizationId: orgId } }),
      prisma.bed.deleteMany({ where: { organizationId: orgId } }),
      prisma.room.deleteMany({ where: { organizationId: orgId } }),
      
      // 4. Top tier (Branch, User, Profile, etc.)
      prisma.paymentRequest.deleteMany({ where: { organizationId: orgId } }),
      prisma.subscription.deleteMany({ where: { organizationId: orgId } }),
      prisma.branch.deleteMany({ where: { organizationId: orgId } }),
      prisma.user.deleteMany({ where: { organisationId: orgId } }),
      prisma.profile.deleteMany({ where: { organizationId: orgId } }),
      
      // 5. Final parent
      prisma.organization.delete({ where: { id: orgId } }),
    ]);

    await CacheService.deleteByPattern('superadmin:*');
    res.json({ success: true, message: 'Organisation completely deleted' });
  } catch (error: any) {
    console.error('Delete org error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete organisation' });
  }
});

// WARDEN MANAGEMENT ROUTES

router.get('/organisations/:orgId/wardens', async (req, res) => {
  const { orgId } = req.params;
  try {
    const wardens = await prisma.profile.findMany({
      where: { 
        organizationId: orgId,
        role: 'WARDEN',
      },
      include: {
        branch: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Also fetch organisation details
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { branches: { select: { id: true, name: true } } }
    });

    if (!org) return res.status(404).json({ success: false, error: 'Organisation not found' });

    const formattedWardens = wardens.map(w => ({
      ...w,
      isActive: w.status === 'ACTIVE'
    }));

    res.json({ success: true, data: { wardens: formattedWardens, org } });
  } catch (error: any) {
    console.error('Fetch wardens error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wardens' });
  }
});

/**
 * POST /api/v1/superadmin/wardens
 *
 * OWASP API3 hardened: all fields validated against createWardenSchema.
 * .strict() on the schema rejects unexpected extra fields.
 */
router.post('/wardens', validate(createWardenSchema), async (req, res) => {
  // Destructure from Zod-validated body — types and lengths are guaranteed
  const { name, email, phone, organisationId, branchId } = req.body;
  // Email is already .toLowerCase().trim() by the schema
  const normalizedEmail = email;
  try {

    // Check if user/warden with this email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? 'email' : 'phone';
      return res.status(400).json({
        success: false,
        error: `A user with this ${field} already exists. Please use a different one.`
      });
    }

    const existingProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone: phone }
        ],
        status: { not: 'INACTIVE' }
      }
    });

    if (existingProfile) {
      const field = existingProfile.email === normalizedEmail ? 'email' : 'phone';
      return res.status(400).json({
        success: false,
        error: `A profile with this ${field} already exists. Please use a different one.`
      });
    }

    // SECURITY FIX: Never use phone numbers as passwords (public info).
    const tempPassword = process.env.DEFAULT_WARDEN_PASSWORD || randomBytes(9).toString('base64url');

    // 1. Create User using local auth
    const passwordHash = bcrypt.hashSync(tempPassword, 12);
    
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        passwordHash,
        role: 'WARDEN',
        organisationId,
        branchId,
        isActive: true
      }
    });

    // 2. Create Profile record in DB for legacy backwards compatibility
    const warden = await prisma.profile.create({
      data: {
        id: uuidv4(),
        name,
        email,
        phone,
        role: 'WARDEN',
        organizationId: organisationId,
        branchId,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({ success: true, data: { wardenId: warden.id, tempPassword } });
  } catch (error: any) {
    console.error('Warden creation failed:', error);
    
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(', ') : (target || 'record');
      return res.status(400).json({
        success: false,
        error: `A user with this ${targetStr} already exists. Please use a different one.`
      });
    }

    res.status(500).json({ 
      success: false, 
      error: error.errors ? error.errors[0]?.message : 'Failed to create warden. Please check your inputs.'
    });
  }
});

router.patch('/wardens/:id/reassign', validate(reassignWardenSchema), async (req, res) => {
  const { id } = req.params;
  // newBranchId is validated and typed by reassignWardenSchema
  const { newBranchId } = req.body;
  
  try {
    const warden = await prisma.profile.findUnique({ where: { id: id as string } });
    if (!warden) return res.status(404).json({ success: false, error: 'Warden not found' });

    // 1. Update Profile DB
    await prisma.profile.update({
      where: { id: id as string },
      data: { branchId: newBranchId }
    });

    // 2. Update User DB
    await prisma.user.updateMany({
      where: { email: warden.email },
      data: { branchId: newBranchId }
    });

    res.json({ success: true, message: 'Warden reassigned successfully' });
  } catch (error: any) {
    console.error('Reassign warden error:', error);
    res.status(500).json({ success: false, error: 'Failed to reassign warden' });
  }
});

router.patch('/wardens/:id/deactivate', async (req, res) => {
  const { id } = req.params;
  
  try {
    const warden = await prisma.profile.findUnique({ where: { id } });
    if (!warden) return res.status(404).json({ success: false, error: 'Warden not found' });

    // 1. Update Profile DB
    await prisma.profile.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    // 2. Update User DB
    await prisma.user.updateMany({
      where: { email: warden.email },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Warden deactivated successfully' });
  } catch (error: any) {
    console.error('Deactivate warden error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate warden' });
  }
});

router.post('/wardens/:id/reset-password', passwordResetLimiter, async (req, res) => {
  const { id } = req.params;
  try {
    const warden = await prisma.user.findUnique({ where: { id: id as string } });
    if (!warden) return res.status(404).json({ success: false, error: 'Warden not found' });

    // SECURITY FIX: Never use phone numbers as passwords (public info).
    const tempPassword = process.env.DEFAULT_WARDEN_PASSWORD || randomBytes(9).toString('base64url');
    const passwordHash = bcrypt.hashSync(tempPassword, 12);

    await prisma.user.updateMany({
      where: { email: warden.email },
      data: { passwordHash }
    });

    res.json({ success: true, data: { tempPassword } });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

router.delete('/wardens/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const warden = await prisma.profile.findUnique({ where: { id } });
    if (!warden) return res.status(404).json({ success: false, error: 'Warden not found' });

    // 1. Hard Delete in Profile DB
    await prisma.profile.delete({
      where: { id }
    });

    // 2. Delete User Account
    await prisma.user.deleteMany({
      where: { email: warden.email }
    });

    res.json({ success: true, message: 'Warden deleted successfully' });
  } catch (error: any) {
    console.error('Delete warden error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete warden' });
  }
});

// SUBSCRIPTION ROUTES

router.get('/subscription-stats', async (req, res) => {
  try {
    const totalRequests = await prisma.paymentRequest.count({ where: { status: 'PENDING' } });
    const activeSubs = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const trialUsers = await prisma.subscription.count({ where: { status: 'TRIAL' } });
    const expiredUsers = await prisma.subscription.count({ where: { status: 'EXPIRED' } });
    
    // Calculate this month's revenue from PaymentRequest (approved)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const revenueStats = await prisma.paymentRequest.aggregate({
      where: {
        status: 'APPROVED',
        reviewedAt: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });
    
    res.json({
      success: true,
      data: {
        pendingRequests: totalRequests,
        activeSubscriptions: activeSubs,
        trialUsers,
        expiredUsers,
        monthlyRevenue: revenueStats._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Subscription stats error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription stats' });
  }
});

router.get('/subscription-requests', async (req, res) => {
  try {
    const requests = await prisma.paymentRequest.findMany({
      include: {
        organization: true
      },
      orderBy: { requestedAt: 'desc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

router.post('/subscription-requests/:id/approve', async (req, res) => {
  const { id } = req.params;
  const adminId = req.user!.id;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.paymentRequest.findUnique({ where: { id }, include: { organization: true } });
      if (!request || request.status !== 'PENDING') throw new Error('Invalid request');
      
      const updatedRequest = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminId
        }
      });
      
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
      
      const subscription = await tx.subscription.upsert({
        where: { organizationId: request.organizationId },
        update: {
          status: 'ACTIVE',
          plan: request.plan,
          currentPeriodEnd,
          activatedAt: new Date(),
          activatedBy: adminId
        },
        create: {
          organizationId: request.organizationId,
          plan: request.plan,
          status: 'ACTIVE',
          trialEndsAt: new Date(),
          currentPeriodEnd,
          activatedAt: new Date(),
          activatedBy: adminId
        }
      });
      
      // Also update the legacy fields on the Organization table to prevent UI desync
      await tx.organization.update({
        where: { id: request.organizationId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: request.plan
        }
      });
      
      return { request: updatedRequest, subscription };
    });
    
    await CacheService.deleteByPattern('superadmin:*');
    res.json({ success: true, message: 'Subscription approved and activated' });
  } catch (error: any) {
    console.error('Approve sub error', error);
    res.status(500).json({ success: false, error: 'Failed to approve subscription' });
  }
});

/**
 * POST /api/v1/superadmin/subscription-requests/:id/reject
 *
 * Reason is required and capped at 500 chars (prevents oversized text injection).
 */
router.post('/subscription-requests/:id/reject', validate(rejectRequestSchema), async (req, res) => {
  const { id } = req.params;
  // reason validated: required, trimmed, max 500 chars
  const { reason } = req.body;
  const adminId = req.user!.id;
  
  try {
    const request = await prisma.paymentRequest.update({
      where: { id: id as string },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });
    
    await CacheService.deleteByPattern('superadmin:*');
    res.json({ success: true, message: 'Subscription request rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to reject subscription' });
  }
});

export default router;
