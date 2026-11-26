import type { LevelId, ScoreSubmission } from '@pixel-hero/shared';

export interface AntiCheatResult {
  ok: boolean;
  reason?: string;
}

const LEVEL_LIMITS: Record<
  LevelId,
  {
    minDurationSec: number;
    maxScore: number;
    maxGems: number;
    maxKills: number;
  }
> = {
  '1-1': {
    minDurationSec: 30,
    maxScore: 95_000,
    maxGems: 150,
    maxKills: 60,
  },
  '1-2': {
    minDurationSec: 60,
    maxScore: 210_000,
    maxGems: 320,
    maxKills: 120,
  },
  '1-3': {
    minDurationSec: 90,
    maxScore: 340_000,
    maxGems: 480,
    maxKills: 180,
  },
};

export function validateAntiCheat(submission: ScoreSubmission): AntiCheatResult {
  const limits = LEVEL_LIMITS[submission.level];

  if (submission.durationSec < limits.minDurationSec) {
    return {
      ok: false,
      reason: `Thời gian hoàn thành (${submission.durationSec}s) nhỏ hơn mức tối thiểu (${limits.minDurationSec}s).`,
    };
  }

  if (submission.score > limits.maxScore) {
    return {
      ok: false,
      reason: `Điểm số (${submission.score}) vượt quá trần lý thuyết của màn ${submission.level}.`,
    };
  }

  if (submission.gems > limits.maxGems) {
    return {
      ok: false,
      reason: `Số gem (${submission.gems}) vượt quá giới hạn hợp lệ.`,
    };
  }

  if (submission.kills > limits.maxKills) {
    return {
      ok: false,
      reason: `Số quái tiêu diệt (${submission.kills}) vượt quá giới hạn hợp lệ.`,
    };
  }

  const levelCount = submission.level === '1-1' ? 1 : submission.level === '1-2' ? 2 : 3;
  const maxByActivity =
    submission.gems * 250 + submission.kills * 8000 + levelCount * 45_000;
  if (submission.score > maxByActivity) {
    return {
      ok: false,
      reason: 'Điểm số không khớp với dữ liệu màn chơi.',
    };
  }

  return { ok: true };
}
