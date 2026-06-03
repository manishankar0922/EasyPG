import axios from 'axios';

/**
 * U9 Solutions - API Test Suite (Automated)
 */

const BASE_URL = 'http://localhost:4000/api';
const TOKEN = 'mock-dev-token'; // Using bypass for testing

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function runTests() {
  console.log('🚀 Starting U9 API Automated Tests...\n');

  try {
    // 1. Test Organization
    console.log('🏢 Testing Organization...');
    const orgRes = await api.get('/organizations');
    console.log('✅ Organization Fetch Success:', orgRes.data.data.name);

    // 2. Test Branches
    console.log('\n📍 Testing Branches...');
    const branchRes = await api.get('/branches');
    const branchId = branchRes.data.data[0]?.id;
    console.log(`✅ Branches Found: ${branchRes.data.data.length}`);
    if (branchId) console.log(`👉 Using Branch ID: ${branchId}`);

    // 3. Test Rooms
    console.log('\n🛏️ Testing Rooms...');
    const roomRes = await api.get('/rooms');
    console.log(`✅ Rooms Found: ${roomRes.data.data.length}`);

    // 4. Test Dashboard
    console.log('\n📊 Testing Dashboard...');
    const dashRes = await api.get('/dashboard');
    console.log('✅ Dashboard Summary:');
    console.table(dashRes.data.data.summary);

    // 5. Test Tenant Creation
    console.log('\n👤 Testing Tenant Creation...');
    const tenantRes = await api.post('/tenants', {
      name: 'Test Tenant ' + Date.now(),
      phone: '9988' + Math.floor(Math.random() * 1000000),
      status: 'ACTIVE'
    });
    console.log('✅ Tenant Created:', tenantRes.data.data.id);

    console.log('\n✨ All automated tests passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    process.exit(1);
  }
}

runTests();
