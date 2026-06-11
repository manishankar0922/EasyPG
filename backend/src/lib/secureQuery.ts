import prisma from '../config/db';

/**
 * Secure wrapper functions for Prisma that ALWAYS enforce organisationId.
 * Never use raw prisma.model.findUnique without checking organisationId.
 */

export const secureQuery = {
  tenant: {
    findUnique: async (tenantId: string, organisationId: string) => {
      return await prisma.tenant.findUnique({
        where: {
          id: tenantId,
          organizationId: organisationId
        }
      });
    },
    findMany: async (organisationId: string, branchId?: string) => {
      return await prisma.tenant.findMany({
        where: {
          organizationId: organisationId,
          // If branchId is provided, enforce it via the active admission
          ...(branchId && {
            admissions: {
              some: {
                room: { branchId },
                status: 'ACTIVE'
              }
            }
          })
        }
      });
    }
  },
  room: {
    findUnique: async (roomId: string, organisationId: string) => {
      return await prisma.room.findUnique({
        where: {
          id: roomId,
          organizationId: organisationId
        }
      });
    }
  },
  branch: {
    findUnique: async (branchId: string, organisationId: string) => {
      return await prisma.branch.findUnique({
        where: {
          id: branchId,
          organizationId: organisationId
        }
      });
    }
  },
  invoice: {
    findUnique: async (invoiceId: string, organisationId: string) => {
      return await prisma.invoice.findUnique({
        where: {
          id: invoiceId,
          organizationId: organisationId
        }
      });
    }
  }
};
