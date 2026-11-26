export type LevelId = '1-1' | '1-2' | '1-3';

export interface ScoreSubmission {
  name: string;
  score: number;
  level: LevelId;
  durationSec: number;
  gems: number;
  kills: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  level: LevelId;
  durationSec: number;
  createdAt: string;
}

export interface ScoreSubmitResponse {
  id: number;
  rank: number;
}

export interface ApiErrorResponse {
  error: string;
}
