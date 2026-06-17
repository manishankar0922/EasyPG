import http from 'k6/http';
import { check, sleep } from 'k6';

// This configuration scales traffic up and down smoothly
export const options = {
    scenarios: {
        aggressive_ramp_up: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 },   // Fast ramp up to 50 users (Safe for local testing)
                { duration: '1m', target: 50 },    // Hold at 50 users
                { duration: '10s', target: 0 },    // Ramp down
            ],
            gracefulRampDown: '5s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s locally
        http_req_failed: ['rate<0.05'],   // Error rate must be strictly less than 5%
    },
};

// NOTE: Since you are on Ubuntu, we use --network host so localhost works perfectly.
const BASE_URL = 'http://localhost:4000/api/v1';

export default function () {
    // -----------------------------------------------------------
    // SCENARIO 1: Concurrent Login Spike
    // -----------------------------------------------------------
    const loginPayload = JSON.stringify({
        email: 'testowner@easypg.in', // Make sure this user exists in your DB!
        password: 'password123'       // Make sure this is correct!
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
    });

    check(loginRes, {
        'Login successful (status 200)': (r) => r.status === 200,
        'Token received': (r) => r.json('token') !== undefined,
    });

    if (loginRes.status !== 200) {
        sleep(1);
        return;
    }

    const token = loginRes.json('token');
    const authHeaders = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    };

    // -----------------------------------------------------------
    // SCENARIO 2: Dashboard Query Storm (Heavy Reads)
    // -----------------------------------------------------------
    const overviewRes = http.get(`${BASE_URL}/dashboard/overview`, authHeaders);
    check(overviewRes, { 'Dashboard overview loaded': (r) => r.status === 200 });

    const mobileHomeRes = http.get(`${BASE_URL}/dashboard/mobile-home`, authHeaders);
    check(mobileHomeRes, { 'Dashboard mobile-home loaded': (r) => r.status === 200 });

    // -----------------------------------------------------------
    // SCENARIO 3: Organization Setup Bombardment (Queue Test)
    // -----------------------------------------------------------
    if (Math.random() < 0.1) { // 10% of requests trigger setup
        const setupPayload = JSON.stringify({
            branches: [{
                name: `Load Test Branch ${Math.floor(Math.random() * 10000)}`,
                floors: [{ floorNumber: 1, roomCount: 5, bedsPerRoom: 2 }]
            }]
        });

        const setupRes = http.post(`${BASE_URL}/organizations/setup-wizard`, setupPayload, authHeaders);
        check(setupRes, { 'Setup queued successfully (status 202)': (r) => r.status === 202 });
    }

    sleep(Math.random() * 2 + 1); // Think time
}
