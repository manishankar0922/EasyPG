import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

// Get all complaints for the user's organization
router.get('/', async (req, res) => {
  const { organizationId } = req.user!;
  const status = req.query.status as string;

  const complaints = await prisma.complaint.findMany({
    where: {
      organizationId,
      ...(status ? { status: status as any } : {})
    },
    include: {
      tenant: {
        select: {
          name: true,
          phone: true,
          admissions: {
            where: { status: 'ACTIVE' },
            select: {
              room: {
                select: { roomNumber: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return res.json({ success: true, data: complaints });
});

// Update complaint status
const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
});

router.patch('/:id', async (req, res) => {
  const { organizationId } = req.user!;
  const { id } = req.params;
  const { status } = updateSchema.parse(req.body);

  const updated = await prisma.complaint.update({
    where: { id, organizationId },
    data: { 
      status,
      ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : { resolvedAt: null })
    }
  });

  return res.json({ success: true, data: updated });
});

export default router;
