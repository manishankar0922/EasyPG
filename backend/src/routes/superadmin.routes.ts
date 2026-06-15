import { Router } from 'express';
import { requireAuth, attachUserContext, requireRole } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const orgSchema = z.object({
  orgName: z.string().min(2, "Organisation name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  ownerPhone: z.string().regex(/^[0-9]{10}$/, "Invalid phone number"),
  ownerEmail: z.string().email("Invalid email format"),
  ownerAddress: z.string().optional(),
  branches: z.array(z.object({
    name: z.string().min(2, "Branch name is required"),
    address: z.string().optional(),
    floors: z.array(z.object({
      floorNumber: z.number().int(),
      rooms: z.array(z.object({
        roomName: z.string(),
        bedCount: z.number().int().min(1),
        rentPerBed: z.number().min(0)
      })).optional()
    })).optional()
  })).min(1, "At least one branch must be provided")
});

function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

const router = Router();

// Apply auth middleware and require superadmin role
// We accept both SUPERADMIN (from Prisma enum) and superadmin (from Clerk metadata string)
router.use(requireAuth, attachUserContext, requireRole('SUPERADMIN', 'superadmin', 'SUPER_ADMIN', 'admin', 'ADMIN'));

router.get('/dashboard', async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { branches: true, tenants: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalOrgs = orgs.length;
    const activeOrgs = orgs.filter(o => o.subscriptionStatus === 'ACTIVE').length;
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

    res.json({ success: true, data: { summary, organisations: orgs } });
  } catch (error: any) {
    console.error('Superadmin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalOrgs,
      totalBranches,
      totalTenants,
      totalUsers,
      pendingRequests
    ] = await Promise.all([
      prisma.organization.count(), // Fix: Changed organisation to organization
      prisma.branch.count(),
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.paymentRequest.count({
        where: { status: 'PENDING' }
      }).catch(() => 0)
    ]);

    return res.json({
      success: true,
      data: {
        totalOrgs,
        totalBranches,
        totalTenants,
        totalUsers,
        pendingRequests
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/organisations', async (req, res) => {
  console.log('=== ORG CREATION STARTED ===');
  console.log('Body received:', JSON.stringify(req.body, null, 2));

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
    const { orgName, ownerName, ownerPhone, ownerEmail, ownerAddress, branches } = validatedData;
    
    console.log(`Creating org with ${branches.length} branches`);
    branches.forEach((b, i) => {
      console.log(`Branch ${i+1}: ${b.floors?.length || 0} floors`);
      b.floors?.forEach((f, j) => {
        console.log(`  Floor ${j+1}: ${f.rooms?.length || 0} rooms`);
      });
    });

    const tempPassword = ownerPhone; // Temp password is phone number

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organisation
      console.log('Creating organisation...');
      const org = await tx.organization.create({
        data: { 
          id: uuidv4(),
          name: orgName, 
          ownerName: ownerName,
          ownerPhone: ownerPhone,
          email: ownerEmail,
          address: ownerAddress
        }
      });
      console.log('✅ Organisation created:', org.id);

      // 2. Create owner user using custom local auth
      console.log('Creating owner...');
      const passwordHash = bcrypt.hashSync(tempPassword, 12);
      
      const owner = await tx.user.create({
        data: {
          clerkId: 'local_' + uuidv4(),
          name: ownerName,
          email: ownerEmail.toLowerCase().trim(),
          phone: ownerPhone,
          passwordHash,
          role: 'OWNER',
          organisationId: org.id,
          isActive: true
        }
      });
      console.log('✅ Owner User created:', owner.id);

      // Maintain Profile for legacy relations if needed
      await tx.profile.create({
        data: {
          id: uuidv4(),
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone,
          role: 'OWNER',
          organizationId: org.id
        }
      });
      console.log('✅ Legacy Profile created');

      // 3. Create branches, rooms, and beds
      const createdBranches = [];
      let totalRooms = 0;
      let totalBeds = 0;

      for (const branch of branches) {
        console.log(`Creating branch: ${branch.name}...`);
        const createdBranch = await tx.branch.create({
          data: {
            id: uuidv4(),
            name: branch.name,
            address: branch.address || ownerAddress,
            organizationId: org.id
          }
        });
        console.log('✅ Branch created:', createdBranch.id);

        if (branch.floors) {
          for (const floor of branch.floors) {
            console.log(`Processing floor ${floor.floorNumber}...`);
            if (floor.rooms) {
              for (const room of floor.rooms) {
                const createdRoom = await tx.room.create({
                  data: {
                    id: uuidv4(),
                    roomNumber: room.roomName,
                    floor: floor.floorNumber,
                    rentAmount: room.rentPerBed,
                    branchId: createdBranch.id,
                    organizationId: org.id,
                    totalCapacity: room.bedCount,
                  }
                });
                totalRooms++;
                console.log(`  ✅ Room ${createdRoom.roomNumber} created`);

                const bedNames = ['A','B','C','D','E','F','G','H'];
                const bedData = [];
                for (let i = 0; i < room.bedCount; i++) {
                  bedData.push({
                    id: uuidv4(),
                    bedNumber: `Bed ${bedNames[i] || (i + 1)}`,
                    roomId: createdRoom.id,
                    organizationId: org.id,
                    isOccupied: false
                  });
                  totalBeds++;
                }
                
                if (bedData.length > 0) {
                  await tx.bed.createMany({ data: bedData });
                  console.log(`  ✅ ${room.bedCount} beds created for room ${createdRoom.roomNumber}`);
                }
              }
            }
          }
        }
        createdBranches.push(createdBranch.id);
      }

      // 4. Create trial subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: 'STARTER',
          status: 'TRIAL',
          trialEndsAt: trialEnd
        }
      });
      console.log('✅ Trial subscription created');

      console.log(`\n=== CREATION COMPLETE ===`);
      console.log(`Org: ${org.id}`);
      console.log(`Owner: ${owner.id}`);
      console.log(`Rooms: ${totalRooms}`);
      console.log(`Beds: ${totalBeds}`);

      return {
        orgId: org.id,
        ownerId: owner.id,
        branchIds: createdBranches,
        totalRooms,
        totalBeds,
        ownerCredentials: {
          email: ownerEmail,
          tempPassword: tempPassword
        }
      };
    }, {
      maxWait: 15000,
      timeout: 30000 // Extended timeout for large orgs
    });

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
    

    console.error('Organisation creation failed:', error);
    require('fs').writeFileSync('/tmp/easypg_error.log', JSON.stringify({
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    }, null, 2));

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create organisation',
      stack: error.stack
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
          select: { tenants: true, branches: true }
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
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ success: false, error: 'Organisation not found' });

    const newStatus = org.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: newStatus }
    });

    res.json({ success: true, message: `Organisation status updated to ${newStatus}` });
  } catch (error: any) {
    console.error('Toggle status error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle organisation status' });
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

    res.json({ success: true, data: { wardens, org } });
  } catch (error: any) {
    console.error('Fetch wardens error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wardens' });
  }
});

router.post('/wardens', async (req, res) => {
  const { name, email, phone, organisationId, branchId } = req.body;
  try {
    const tempPassword = phone; // temp password is phone

    // 1. Create User using local auth
    const passwordHash = bcrypt.hashSync(tempPassword, 12);
    
    const user = await prisma.user.create({
      data: {
        clerkId: 'local_warden_' + uuidv4(),
        name,
        email: email.toLowerCase().trim(),
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

router.patch('/wardens/:id/reassign', async (req, res) => {
  const { id } = req.params;
  const { newBranchId } = req.body;
  
  try {
    const warden = await prisma.profile.findUnique({ where: { id } });
    if (!warden) return res.status(404).json({ success: false, error: 'Warden not found' });

    // 1. Update Profile DB
    await prisma.profile.update({
      where: { id },
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

router.post('/wardens/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  try {
    const warden = await prisma.profile.findUnique({ where: { id } });
    if (!warden) return res.status(404).json({ success: false, error: 'Warden not found' });

    const tempPassword = warden.phone || 'password123';
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

    // 1. Soft Delete in Profile DB
    await prisma.profile.update({
      where: { id },
      data: { status: 'INACTIVE' }
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
      where: { status: 'PENDING' },
      include: {
        organization: true
      },
      orderBy: { requestedAt: 'asc' }
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
      
      return { request: updatedRequest, subscription };
    });
    
    res.json({ success: true, message: 'Subscription approved and activated' });
  } catch (error: any) {
    console.error('Approve sub error', error);
    res.status(500).json({ success: false, error: 'Failed to approve subscription' });
  }
});

router.post('/subscription-requests/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user!.id;
  
  try {
    const request = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });
    
    res.json({ success: true, message: 'Subscription request rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to reject subscription' });
  }
});

export default router;
