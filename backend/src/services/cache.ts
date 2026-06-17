import { redisConnection } from '../jobs/index';

const inMemoryCache = new Map<string, { value: any, expiry: number }>();

export const CacheService = {
  async get(key: string) {
    try {
      if (redisConnection.status === 'ready') {
        const data = await redisConnection.get(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (e) {
      console.warn('Redis get failed, falling back to in-memory', e);
    }
    
    const item = inMemoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      inMemoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: any, ttlSeconds: number) {
    const stringValue = JSON.stringify(value);
    try {
      if (redisConnection.status === 'ready') {
        await redisConnection.setex(key, ttlSeconds, stringValue);
        return;
      }
    } catch (e) {
      console.warn('Redis set failed, falling back to in-memory', e);
    }

    inMemoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  },

  async delete(key: string) {
    try {
      if (redisConnection.status === 'ready') {
        await redisConnection.del(key);
      }
    } catch (e) {
      // Ignore
    }
    inMemoryCache.delete(key);
  },

  async deleteByPattern(pattern: string) {
    try {
      if (redisConnection.status === 'ready') {
        const keys = await redisConnection.keys(pattern);
        if (keys.length > 0) {
          await redisConnection.del(...keys);
        }
      }
    } catch (e) {
      // Ignore
    }
    // Very basic memory pattern matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of inMemoryCache.keys()) {
      if (regex.test(key)) {
        inMemoryCache.delete(key);
      }
    }
  }
};
