/**
 * Unit tests for sanitizeResponse — a pure function with NO database or Redis
 * dependency, so it runs anywhere `npm test` runs. This is the kind of test the
 * project was missing: the only other test (health.test.ts) requires a live DB.
 */
import { sanitizeResponse } from './sanitizeResponse';

describe('sanitizeResponse', () => {
  it('passes through null and undefined untouched', () => {
    expect(sanitizeResponse(null)).toBeNull();
    expect(sanitizeResponse(undefined)).toBeUndefined();
  });

  it('passes through primitives untouched', () => {
    expect(sanitizeResponse(42)).toBe(42);
    expect(sanitizeResponse('hello')).toBe('hello');
    expect(sanitizeResponse(true)).toBe(true);
  });

  it('passes through Date instances untouched (not treated as plain object)', () => {
    const date = new Date('2026-01-01');
    expect(sanitizeResponse(date)).toBe(date);
  });

  it('strips known sensitive top-level keys', () => {
    const user = {
      id: '1',
      name: 'Ada',
      password: 'hunter2',
      clerkId: 'clerk_abc',
      internalNotes: 'private',
      deletedAt: null,
      createdBy: 'system',
      updatedBy: 'admin',
    };
    const result = sanitizeResponse(user);
    expect(result).toEqual({ id: '1', name: 'Ada' });
  });

  it('strips keys ending in Hash or Secret', () => {
    const data = { id: '1', passwordHash: 'x', jwtSecret: 'y', token: 'keep' };
    expect(sanitizeResponse(data)).toEqual({ id: '1', token: 'keep' });
  });

  it('recursively sanitizes nested objects', () => {
    const data = {
      id: '1',
      profile: {
        name: 'Ada',
        password: 'leak',
        meta: { apiSecret: 'hidden', ok: true },
      },
    };
    expect(sanitizeResponse(data)).toEqual({
      id: '1',
      profile: { name: 'Ada', meta: { ok: true } },
    });
  });

  it('recursively sanitizes every item in an array', () => {
    const list = [
      { id: '1', password: 'a' },
      { id: '2', password: 'b' },
    ];
    expect(sanitizeResponse(list)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('does not mutate the input object', () => {
    const input = { id: '1', password: 'secret', nested: { apiKey: 'x' } };
    const snapshot = JSON.stringify(input);
    sanitizeResponse(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
