const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany();
  console.log("All profiles:");
  console.log(profiles);
  
  // Also check auth users if we were using real supabase, but we are using mock auth.
  // We can just update the first profile with the email if there is only one.
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
