import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { scoreSubmissionSchema } from '@pixel-hero/shared';
import { validateAntiCheat } from '../antiCheat.js';
import type { ScoreDatabase } from '../db.js';

export function createScoresRouter(scoreDb: ScoreDatabase): Router {
  const router = Router();

  const getLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' });
    },
  });

  const postLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Bạn gửi điểm quá nhanh, vui lòng đợi 1 phút.' });
    },
  });

  router.get('/leaderboard', getLimiter, (req, res) => {
    const rawLimit = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 10;
    const entries = scoreDb.getLeaderboard(limit);
    res.json(entries);
  });

  router.post('/score', postLimiter, (req, res) => {
    const parsed = scoreSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu gửi lên không hợp lệ.',
      });
      return;
    }

    const antiCheat = validateAntiCheat(parsed.data);
    if (!antiCheat.ok) {
      res.status(400).json({
        error: antiCheat.reason ?? 'Điểm số không hợp lệ.',
      });
      return;
    }

    const result = scoreDb.insertScore(parsed.data);
    res.status(201).json(result);
  });

  return router;
}
