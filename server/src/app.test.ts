import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createDatabase, type ScoreDatabase } from './db.js';

describe('Server Leaderboard API', () => {
  let db: ScoreDatabase;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('returns health ok and empty leaderboard initially', async () => {
    const app = createApp({ db, serveStatic: false });

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true });

    const lb = await request(app).get('/api/leaderboard');
    expect(lb.status).toBe(200);
    expect(lb.body).toEqual([]);
  });

  it('rejects invalid names, cheated scores, and unrealistically fast durations', async () => {
    const app = createApp({ db, serveStatic: false });

    const invalidName = await request(app).post('/api/score').send({
      name: 'admin!!!',
      score: 12000,
      level: '1-1',
      durationSec: 80,
      gems: 20,
      kills: 5,
    });
    expect(invalidName.status).toBe(400);

    const overScore = await request(app).post('/api/score').send({
      name: 'PipPlayer',
      score: 999_999,
      level: '1-1',
      durationSec: 80,
      gems: 20,
      kills: 5,
    });
    expect(overScore.status).toBe(400);

    const tooFast = await request(app).post('/api/score').send({
      name: 'SpeedRun',
      score: 10_000,
      level: '1-3',
      durationSec: 15,
      gems: 10,
      kills: 5,
    });
    expect(tooFast.status).toBe(400);
  });

  it('accepts valid scores and sorts leaderboard by score DESC, duration ASC', async () => {
    const app = createApp({ db, serveStatic: false });

    const p1 = await request(app).post('/api/score').send({
      name: 'Nguyễn Văn A',
      score: 25_000,
      level: '1-2',
      durationSec: 120,
      gems: 40,
      kills: 15,
    });
    expect(p1.status).toBe(201);
    expect(p1.body).toMatchObject({ id: 1, rank: 1 });

    const p2 = await request(app).post('/api/score').send({
      name: 'Pip_Pro',
      score: 25_000,
      level: '1-2',
      durationSec: 95,
      gems: 45,
      kills: 18,
    });
    expect(p2.status).toBe(201);
    expect(p2.body.rank).toBe(1);

    const p3 = await request(app).post('/api/score').send({
      name: 'Hero-1',
      score: 45_000,
      level: '1-3',
      durationSec: 180,
      gems: 70,
      kills: 30,
    });
    expect(p3.status).toBe(201);
    expect(p3.body.rank).toBe(1);

    const lb = await request(app).get('/api/leaderboard?limit=10');
    expect(lb.status).toBe(200);
    expect(lb.body).toHaveLength(3);
    expect(lb.body[0].name).toBe('Hero-1');
    expect(lb.body[1].name).toBe('Pip_Pro');
    expect(lb.body[2].name).toBe('Nguyễn Văn A');
  });

  it('enforces POST rate limit (429 after 5 POSTs per minute)', async () => {
    const app = createApp({ db, serveStatic: false });
    const payload = {
      name: 'Tester',
      score: 5000,
      level: '1-1',
      durationSec: 60,
      gems: 10,
      kills: 4,
    };

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/score').send(payload);
      expect(res.status).toBe(201);
    }

    const blocked = await request(app).post('/api/score').send(payload);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBeTypeOf('string');
  });
});
