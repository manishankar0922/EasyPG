import request from 'supertest';
import app from '../index';

describe('Health Endpoints', () => {
  it('GET /api/v1/health should return 200 OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'OK',
        timestamp: expect.any(String)
      })
    );
  });

  it('GET /api/v1/health/db should return DB status', async () => {
    const res = await request(app).get('/api/v1/health/db');
    // If db is connected or disconnected, status could be 200 or 500
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    } else {
      expect(res.body.status).toBe('unhealthy');
    }
  }, 30000);
});
