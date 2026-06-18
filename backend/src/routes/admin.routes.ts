import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { validate } from '../middlewares/validation.middleware';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();

// Apply auth middleware to protect all admin endpoints
router.use(authMiddleware);

// Middleware to enforce SUPER_ADMIN role
const requireSuperAdmin = (req: any, res: any, next: any) => {
  const allowed = ['SUPER_ADMIN', 'SUPERADMIN', 'superadmin', 'admin', 'ADMIN'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Super Admin role required' });
  }
  next();
};

router.use(requireSuperAdmin);

// GET /api/admin/system-logs - Get recent system logs
router.get('/system-logs', async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/admin/organizations - List all organizations with their stats
router.post('/organizations/:id/impersonate', async (req, res) => {
  const orgId = req.params.id;
  try {
    const profile = await prisma.profile.findFirst({
      where: { organizationId: orgId, role: 'OWNER' }
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Owner profile not found for this organization.' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET missing from .env!');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    // Generate a temporary JWT token valid for 2 hours
    const token = jwt.sign({ id: profile.id, role: profile.role, organizationId: profile.organizationId }, JWT_SECRET, { expiresIn: '2h' });

    res.json({
      success: true,
      data: {
        session: { access_token: token },
        user: profile
      }
    });
  } catch (error: any) {
    console.error('Impersonate error:', error);
    res.status(500).json({ success: false, error: 'Failed to impersonate.' });
  }
});

// GET /api/admin/organizations - List all organizations with their stats
router.get('/organizations', async (req, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        profiles: {
          where: { role: 'OWNER' }
        },
        _count: {
          select: {
            branches: true,
            rooms: true,
            tenants: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedOrgs = organizations.map(org => {
      const owner = org.profiles[0] || null;
      return {
        id: org.id,
        name: org.name,
        ownerName: org.ownerName,
        ownerPhone: org.ownerPhone,
        subscriptionPlan: org.subscriptionPlan,
        subscriptionStatus: org.subscriptionStatus,
        maxBranches: org.maxBranches,
        maxRooms: org.maxRooms,
        createdAt: org.createdAt,
        ownerEmail: owner ? owner.email : null,
        ownerId: owner ? owner.id : null,
        stats: {
          branchesCount: org._count.branches,
          roomsCount: org._count.rooms,
          tenantsCount: org._count.tenants
        }
      };
    });

    res.json({ success: true, data: formattedOrgs });
  } catch (error: any) {
    console.error('Error fetching admin organizations:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin/organizations - Create a new organization and its owner profile
const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    ownerName: z.string().min(2).max(100),
    ownerPhone: z.string().min(10).max(20),
    email: z.string().email(),
    address: z.string().optional(),
    subscriptionPlan: z.string().optional(),
    maxBranches: z.number().int().positive().optional(),
    maxRooms: z.number().int().positive().optional(),
    floors: z.array(z.object({
      floorNumber: z.number().int().min(1),
      rooms: z.array(z.object({
        roomName: z.string().min(1),
        bedCount: z.number().int().min(1).max(8),
        rentPerBed: z.number().min(0),
      }))
    })).optional(),
  })
});

router.post('/organizations', validate(createOrgSchema), async (req, res) => {
  const { name, ownerName, ownerPhone, email, address, subscriptionPlan, maxBranches, maxRooms, floors } = req.body;

  try {
    const existingProfile = await prisma.profile.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (existingProfile) {
      return res.status(400).json({ success: false, error: 'A profile with this email address already exists' });
    }

    const newOwnerId = randomUUID();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organisation
      const org = await tx.organization.create({
        data: {
          name,
          ownerName,
          ownerPhone,
          subscriptionPlan: subscriptionPlan || 'TRIAL',
          maxBranches: maxBranches || 3,
          maxRooms: maxRooms || 50
        }
      });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: subscriptionPlan === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO',
          status: 'TRIAL',
          trialEndsAt
        }
      });

      // 2. Create Owner Profile
      const profile = await tx.profile.create({
        data: {
          id: newOwnerId,
          organizationId: org.id,
          name: ownerName,
          email: email.toLowerCase(),
          phone: ownerPhone,
          role: 'OWNER'
        }
      });

      // 3. Create one default Branch to hold the address
      let branch = await tx.branch.create({
        data: {
          name: `${name} - Main Branch`,
          address: address || '',
          organizationId: org.id,
          floors: floors && Array.isArray(floors) ? floors.length : 1,
        }
      });

      let roomsCreated = 0;
      let bedsCreated = 0;

      if (floors && Array.isArray(floors) && floors.length > 0) {
        const BED_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        for (const floor of floors) {
          if (!floor.rooms) continue;
          for (const roomData of floor.rooms) {
            const room = await tx.room.create({
              data: {
                organizationId: org.id,
                branchId: branch.id,
                roomNumber: roomData.roomName,
                floor: floor.floorNumber,
                totalCapacity: roomData.bedCount,
                roomType: 'CUSTOM',
                rentAmount: roomData.rentPerBed,
                genderType: 'BOYS',
              }
            });
            roomsCreated++;

            const bedData = Array.from({ length: roomData.bedCount }, (_, i) => ({
              organizationId: org.id,
              roomId: room.id,
              bedNumber: `Bed ${BED_LETTERS[i] || (i + 1)}`,
            }));
            await tx.bed.createMany({ data: bedData });
            bedsCreated += roomData.bedCount;
          }
        }
      }

      await tx.systemLog.create({
        data: {
          adminId: req.user!.id,
          action: 'CREATE_ORGANIZATION',
          details: `Provisioned new organization: ${org.name} with Owner: ${ownerName}`,
          targetOrgId: org.id
        }
      });

      return { org, profile, branch, roomsCreated, bedsCreated };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    // Log the REAL error
    console.error('Organisation creation failed:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })

    // Return specific Prisma error messages
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Organisation with this name or email already exists.'
      })
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference. Check all IDs are correct.'
      })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Related record not found.'
      })
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Organisation creation failed',
      detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
});

// PUT /api/admin/organizations/:id/subscription - Update subscription limits
const updateSubscriptionSchema = z.object({
  body: z.object({
    subscriptionPlan: z.string().min(2).max(30),
    subscriptionStatus: z.string().min(2).max(30),
    maxBranches: z.number().int().positive(),
    maxRooms: z.number().int().positive(),
  })
});

router.put('/organizations/:id/subscription', validate(updateSubscriptionSchema), async (req, res) => {
  const orgId = req.params.id as string;
  const { subscriptionPlan, subscriptionStatus, maxBranches, maxRooms } = req.body;

  try {
    const updatedOrg = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: orgId },
        data: {
          subscriptionPlan,
          subscriptionStatus,
          maxBranches,
          maxRooms
        }
      });

      // Synchronize the dedicated Subscription table as well
      const sub = await tx.subscription.findUnique({ where: { organizationId: orgId } });
      let trialEndsAt = sub?.trialEndsAt || new Date(0);
      const now = new Date();
      let currentPeriodEnd = null;

      // Aggressive 1-time Trial Enforcement
      if (subscriptionStatus === 'TRIAL') {
        if (sub && sub.trialEndsAt && sub.trialEndsAt < now) {
          throw new Error('This organization has already used their 1-time 14-day trial. You cannot grant another trial. Please upgrade them to PRO or ENTERPRISE.');
        }
        trialEndsAt = new Date(now.setDate(now.getDate() + 14));
      } else if (subscriptionStatus === 'ACTIVE') {
        const _now = new Date();
        if (subscriptionPlan === 'BASIC') {
           // BASIC HYBRID: 14 days PRO features + 1 month BASIC features
           trialEndsAt = new Date(_now.setDate(_now.getDate() + 14));
           currentPeriodEnd = new Date(trialEndsAt);
           currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        } else if (subscriptionPlan === 'STRICT_BASIC') {
           // 5TH PLAN: STRICT BASIC - 14+30 days purely BASIC features (no PRO)
           trialEndsAt = new Date(0); // Set to past to ensure no PRO trial
           currentPeriodEnd = new Date(_now.setDate(_now.getDate() + 44));
        } else if (subscriptionPlan === 'PRO') {
           // STRICT PRO: 14 days PRO + 1 month PRO
           currentPeriodEnd = new Date(_now.setDate(_now.getDate() + 44)); // 14 + 30 days
        } else if (subscriptionPlan === 'ENTERPRISE') {
           // UNLIMITED ACCESS
           currentPeriodEnd = null;
        }
      }

      await tx.subscription.upsert({
        where: { organizationId: orgId },
        update: {
          plan: subscriptionPlan,
          status: subscriptionStatus,
          trialEndsAt: trialEndsAt,
          currentPeriodEnd: currentPeriodEnd,
        },
        create: {
          organizationId: orgId,
          plan: subscriptionPlan,
          status: subscriptionStatus,
          trialEndsAt: trialEndsAt,
          currentPeriodEnd: currentPeriodEnd,
        }
      });

      await tx.systemLog.create({
        data: {
          adminId: req.user!.id,
          action: 'UPDATE_SUBSCRIPTION',
          details: `Updated subscription for ${org.name}: Plan=${subscriptionPlan}, Status=${subscriptionStatus}, Branches=${maxBranches}, Rooms=${maxRooms}`,
          targetOrgId: org.id
        }
      });

      return org;
    });

    res.json({ success: true, data: updatedOrg });
  } catch (error: any) {
    console.error('Error updating organization subscription:', error);
    res.status(400).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/organizations/:id - Permanently delete an organization and all its data
router.delete('/organizations/:id', async (req, res) => {
  const orgId = req.params.id as string;

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Since we don't have onDelete: Cascade, we must manually delete dependent data in order.
    // The order is important to avoid foreign key constraint violations.
    await prisma.$transaction(async (tx) => {
      // 1. Delete deeply nested tenant relations first
      await tx.payment.deleteMany({ where: { organizationId: orgId } });
      await tx.invoice.deleteMany({ where: { organizationId: orgId } });
      await tx.admission.deleteMany({ where: { organizationId: orgId } });
      await tx.complaint.deleteMany({ where: { organizationId: orgId } });
      await tx.notification.deleteMany({ where: { organizationId: orgId } });
      await tx.securityDeposit.deleteMany({ where: { organizationId: orgId } });
      await tx.vacateNotice.deleteMany({ where: { organizationId: orgId } });
      
      // RentLedger doesn't have organizationId directly, so we delete by tenant's organizationId
      const tenants = await tx.tenant.findMany({ where: { organizationId: orgId }, select: { id: true } });
      const tenantIds = tenants.map(t => t.id);
      if (tenantIds.length > 0) {
        await tx.rentLedger.deleteMany({ where: { tenantId: { in: tenantIds } } });
      }

      // 2. Delete tenants and beds
      await tx.tenant.deleteMany({ where: { organizationId: orgId } });
      await tx.bed.deleteMany({ where: { organizationId: orgId } });
      await tx.room.deleteMany({ where: { organizationId: orgId } });
      
      // 3. Delete org-level child models
      await tx.branch.deleteMany({ where: { organizationId: orgId } });
      await tx.profile.deleteMany({ where: { organizationId: orgId } });
      await tx.user.deleteMany({ where: { organisationId: orgId } });
      await tx.subscription.deleteMany({ where: { organizationId: orgId } });
      await tx.paymentRequest.deleteMany({ where: { organizationId: orgId } });

      // 4. Finally delete the organization
      await tx.organization.delete({ where: { id: orgId } });

      await tx.systemLog.create({
        data: {
          adminId: req.user!.id,
          action: 'DELETE_ORGANIZATION',
          details: `Permanently deleted organization: ${org.name} (${orgId})`,
          targetOrgId: orgId
        }
      });
    });

    res.json({ success: true, message: 'Organization and all related data successfully deleted' });
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ success: false, error: 'Failed to delete organization. Please check server logs.' });
  }
});

// PATCH /api/admin/rooms/:roomId — Edit bed count + rent per bed
const editRoomSchema = z.object({
  body: z.object({
    bedCount: z.number().int().min(1).max(8),
    rentPerBed: z.number().min(0),
  }),
  params: z.object({ roomId: z.string().min(5) }),
});

router.patch('/rooms/:roomId', validate(editRoomSchema), async (req, res) => {
  const { roomId } = req.params as { roomId: string };
  const { bedCount, rentPerBed } = req.body;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { beds: true }
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const currentBeds = room.beds;
    const currentCount = currentBeds.length;
    const BED_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    await prisma.$transaction(async (tx) => {
      // ── Bed count increased: create new beds ──────────────────────────
      if (bedCount > currentCount) {
        const newBedData = [];
        for (let i = currentCount; i < bedCount; i++) {
          newBedData.push({
            organizationId: room.organizationId,
            roomId: room.id,
            bedNumber: `Bed ${BED_LETTERS[i]}`,
          });
        }
        await tx.bed.createMany({ data: newBedData });
      }

      // ── Bed count decreased: delete VACANT beds only ──────────────────
      if (bedCount < currentCount) {
        // Identify beds to remove (excess, from the end)
        const bedsToRemove = currentBeds.slice(bedCount); // e.g. if new count is 2, remove index 2+
        const bedIdsToRemove = bedsToRemove.map(b => b.id);

        // Check any of those beds are occupied
        const occupiedCount = bedsToRemove.filter(b => b.isOccupied).length;
        if (occupiedCount > 0) {
          throw new Error(`Cannot remove ${occupiedCount} occupied bed(s). Please vacate them first.`);
        }

        await tx.bed.deleteMany({ where: { id: { in: bedIdsToRemove } } });
      }

      // ── Update room: capacity + rent ───────────────────────────────────
      await tx.room.update({
        where: { id: roomId },
        data: {
          totalCapacity: bedCount,
          rentAmount: rentPerBed,
        }
      });
    });

    // Return updated room with fresh beds
    const updated = await prisma.room.findUnique({
      where: { id: roomId },
      include: { beds: true }
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('Cannot remove')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('Admin room edit error:', err);
    res.status(500).json({ success: false, error: 'Failed to update room' });
  }
});

// GET /api/admin/organisations/:orgId/heatmap
router.get('/organisations/:orgId/heatmap', async (req, res) => {
  const { orgId } = req.params as { orgId: string };
  try {
    const rooms = await prisma.room.findMany({
      where: { organizationId: orgId },
      include: { beds: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Group by floor — same shape as branch heatmap
    const byFloor: Record<number, any[]> = {};
    for (const room of rooms) {
      if (!byFloor[room.floor]) byFloor[room.floor] = [];

      let status = 'INACTIVE';
      if (room.status !== 'INACTIVE') {
        if (room.occupiedCapacity === 0) status = 'VACANT';
        else if (room.occupiedCapacity === room.totalCapacity) status = 'FULL';
        else status = 'PARTIAL';
      }
      // NO_BEDS: room exists but totalCapacity is 0
      if (room.totalCapacity === 0) status = 'NO_BEDS';

      byFloor[room.floor].push({
        roomId: room.id,
        roomName: room.roomNumber,
        totalBeds: room.totalCapacity,
        occupiedBeds: room.occupiedCapacity,
        vacantBeds: room.totalCapacity - room.occupiedCapacity,
        rentPerBed: Number(room.rentAmount),
        status,
      });
    }

    const floors = Object.keys(byFloor)
      .map(Number)
      .sort((a, b) => a - b)
      .map(floor => ({ floorNumber: floor, rooms: byFloor[floor] }));

    res.json({ success: true, data: { floors } });
  } catch (err) {
    console.error('Admin heatmap error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate heatmap' });
  }
});

// GET /api/admin/organisations/:orgId/rooms — all rooms for an org, grouped by floor
router.get('/organisations/:orgId/rooms', async (req, res) => {
  const { orgId } = req.params as { orgId: string };
  try {
    const rooms = await prisma.room.findMany({
      where: { organizationId: orgId },
      include: { beds: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
    res.json({ success: true, data: rooms });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

export default router;
