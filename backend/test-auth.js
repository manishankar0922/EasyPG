const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!user) {
    console.log("No superadmin found in DB.");
    return;
  }
  console.log("Found superadmin:", user.email);
  const token = jwt.sign({ userId: user.id, role: user.role, organisationId: user.organisationId, branchId: user.branchId }, process.env.JWT_SECRET || 'your_development_jwt_secret_here', { expiresIn: '7d' });
  
  const fetch = require('node-fetch'); // wait, fetch is built-in in Node 18+
  const res = await globalThis.fetch('http://localhost:3001/api/superadmin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
test();
