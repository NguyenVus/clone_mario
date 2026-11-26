import type {
  ApiErrorResponse,
  LeaderboardEntry,
  ScoreSubmission,
  ScoreSubmitResponse,
} from '@pixel-hero/shared';

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function fetchLeaderboard(limit = 10): Promise<ApiResult<LeaderboardEntry[]>> {
  try {
    const res = await fetch(`/api/leaderboard?limit=${encodeURIComponent(String(limit))}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
      return {
        ok: false,
        error: errBody?.error ?? 'Không kết nối được bảng xếp hạng',
      };
    }
    const data = (await res.json()) as LeaderboardEntry[];
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Không kết nối được bảng xếp hạng' };
  }
}

export async function submitScore(payload: ScoreSubmission): Promise<ApiResult<ScoreSubmitResponse>> {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
      return {
        ok: false,
        error: errBody?.error ?? 'Không gửi được điểm lên bảng xếp hạng',
      };
    }
    const data = (await res.json()) as ScoreSubmitResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Không kết nối được bảng xếp hạng' };
  }
}
