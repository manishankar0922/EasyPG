import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPasswordHash = await bcrypt.hash('easypg123', 12);

  // Clear existing
  await prisma.systemLog.deleteMany();
  await prisma.paymentRequest.deleteMany();
  await prisma.subscription.deleteMany();
  
  // Clear tenant dependants
  await prisma.payment.deleteMany();
  await prisma.rentLedger.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.securityDeposit.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vacateNotice.deleteMany();
  
  // Clear parent hierarchies
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Superadmin User
  await prisma.user.create({
    data: {
      clerkId: 'superadmin_1',
      name: 'Super Admin',
      email: 'admin@easypg.com',
      passwordHash: defaultPasswordHash,
      role: 'SUPERADMIN'
    }
  });

  // 2. 2 Organisations
  for (let o = 1; o <= 2; o++) {
    const org = await prisma.organization.create({
      data: {
        name: `Org ${o}`,
        ownerName: `Owner ${o}`,
        ownerPhone: `900000000${o}`
      }
    });

    // 1 pending subscription request
    await prisma.paymentRequest.create({
      data: {
        organizationId: org.id,
        plan: 'STARTER',
        amount: 499,
        upiRefNumber: `UPI${o}00000`,
        status: 'PENDING'
      }
    });

    // 3. 2 branches per org
    for (let b = 1; b <= 2; b++) {
      const branch = await prisma.branch.create({
        data: {
          name: `Branch ${b} (Org ${o})`,
          organizationId: org.id,
          address: `123 Main St, Area ${b}`
        }
      });

      for (let w = 1; w <= 2; w++) {
        await prisma.user.create({
          data: {
            clerkId: `warden_${o}_${b}_${w}`,
            name: `Warden ${w}`,
            email: `warden${w}@org${o}branch${b}.com`,
            passwordHash: defaultPasswordHash,
            role: 'WARDEN',
            organisationId: org.id,
            branchId: branch.id
          }
        });
      }

      const allBeds = [];

      // 4. 3 floors, 5 rooms per floor
      for (let f = 1; f <= 3; f++) {
        for (let r = 1; r <= 5; r++) {
          const room = await prisma.room.create({
            data: {
              organizationId: org.id,
              branchId: branch.id,
              roomNumber: `${f}0${r}`,
              floor: f,
              totalCapacity: 3,
              rentAmount: 5000,
              roomType: 'TRIPLE'
            }
          });

          // 5. 3 beds per room
          for (let bedNum = 1; bedNum <= 3; bedNum++) {
            const bed = await prisma.bed.create({
              data: {
                organizationId: org.id,
                roomId: room.id,
                bedNumber: `Bed ${String.fromCharCode(64 + bedNum)}`
              }
            });
            allBeds.push(bed);
          }
        }
      }

      // 6. 10 active tenants per branch
      for (let t = 1; t <= 10; t++) {
        const tenant = await prisma.tenant.create({
          data: {
            organizationId: org.id,
            name: `Tenant ${t} (B${b})`,
            phone: `8000${o}${b}${t.toString().padStart(3, '0')}`
          }
        });

        const bed = allBeds[t - 1]; // Pick a bed
        await prisma.bed.update({ where: { id: bed.id }, data: { isOccupied: true } });

        await prisma.admission.create({
          data: {
            organizationId: org.id,
            tenantId: tenant.id,
            roomId: bed.roomId,
            bedId: bed.id,
            checkinDate: new Date('2024-05-01'),
            monthlyRent: 5000,
            status: 'ACTIVE'
          }
        });

        // 7. 2 months of rent ledger entries
        // 8. Mix of paid, partial, overdue
        const statuses = ['PAID', 'PARTIAL', 'OVERDUE', 'PENDING'] as any[];
        
        for (let month = 5; month <= 6; month++) {
          const status = statuses[(t + month) % 4];
          let paidAmount = 0;
          if (status === 'PAID') paidAmount = 5000;
          if (status === 'PARTIAL') paidAmount = 2500;
          
          await prisma.rentLedger.create({
            data: {
              tenantId: tenant.id,
              month,
              year: 2024,
              expectedRent: 5000,
              totalDue: 5000,
              paidAmount,
              balanceFromLastMonth: 0,
              status,
              dueDate: new Date(`2024-0${month}-05`)
            }
          });
        }
      }
    }
  }

  console.log('Seed completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
