import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Test Organization",
        branches: {
          create: {
            name: "Main Branch",
            code: "MAIN01"
          }
        }
      }
    });
  }
  
  const hashedPassword = await bcrypt.hash("Password123", 12);
  
  const user = await prisma.user.upsert({
    where: { email: "owner@test.com" },
    update: { passwordHash: hashedPassword, organisationId: org.id, role: "OWNER" },
    create: {
      name: "Test Owner",
      email: "owner@test.com",
      passwordHash: hashedPassword,
      role: "OWNER",
      organisationId: org.id
    }
  });
  
  console.log(JSON.stringify({
    name: user.name,
    email: user.email,
    password: "Password123",
    organisationId: org.id
  }, null, 4));
}

main().catch(console.error).finally(() => prisma.$disconnect());
