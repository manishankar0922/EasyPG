import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// We MUST use the service_role key to bypass email verification for the seed user
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('🌱 Seeding Supabase Auth User...');

  const TEST_EMAIL = 'admin@u9solutions.com';
  const TEST_PASSWORD = 'Password123!';
  const ORG_ID = '00000000-0000-0000-0000-000000000001';

  // 1. Create the user in Supabase Auth (GoTrue)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true, // Auto-confirm the email
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
        console.log('⚠️ User already exists in Supabase. Proceeding to sync profile...');
    } else {
        console.error('❌ Supabase Auth Error:', authError.message);
        process.exit(1);
    }
  }

  // Get the ID (either from creation or we look it up)
  let userId = authData?.user?.id;
  
  if (!userId) {
     const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
     const existingUser = users.find(u => u.email === TEST_EMAIL);
     if (existingUser) userId = existingUser.id;
  }

  if (!userId) throw new Error("Could not determine User ID");

  console.log(`✅ Supabase User Ready: ${userId}`);

  // 2. Sync to Prisma Profile
  await prisma.profile.upsert({
    where: { id: userId },
    update: {
      organizationId: ORG_ID,
      role: 'OWNER',
    },
    create: {
      id: userId,
      organizationId: ORG_ID,
      name: 'System Admin',
      role: 'OWNER',
    },
  });

  console.log(`✅ Profile Linked in Database`);
  console.log('\n=========================================');
  console.log('🎉 YOU CAN NOW LOG IN MANUALLY');
  console.log('=========================================');
  console.log(`Email:    ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD}`);
  console.log('=========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
