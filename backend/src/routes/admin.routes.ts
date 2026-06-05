import { Router } from 'express';
import prisma from '../config/db';
import { authMiddleware } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { validate } from '../middlewares/validation.middleware';
import { randomUUID } from 'crypto';

const router = Router();

// Apply auth middleware to protect all admin endpoints
router.use(authMiddleware);

// Middleware to enforce SUPER_ADMIN role
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Access denied: Super Admin role required' });
  }
  next();
};

router.use(requireSuperAdmin);

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
    subscriptionPlan: z.string().optional(),
    maxBranches: z.number().int().positive().optional(),
    maxRooms: z.number().int().positive().optional(),
  })
});

router.post('/organizations', validate(createOrgSchema), async (req, res) => {
  const { name, ownerName, ownerPhone, email, subscriptionPlan, maxBranches, maxRooms } = req.body;

  try {
    const existingProfile = await prisma.profile.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (existingProfile) {
      return res.status(400).json({ success: false, error: 'A profile with this email address already exists' });
    }

    const newOwnerId = randomUUID();

    const result = await prisma.$transaction(async (tx) => {
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

      return { org, profile };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error creating organization/owner:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
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
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionPlan,
        subscriptionStatus,
        maxBranches,
        maxRooms
      }
    });

    res.json({ success: true, data: updatedOrg });
  } catch (error: any) {
    console.error('Error updating organization subscription:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
