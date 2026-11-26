import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { LeaderboardEntry, LevelId, ScoreSubmission } from '@pixel-hero/shared';

export interface ScoreDatabase {
  db: Database.Database;
  insertScore: (submission: ScoreSubmission) => { id: number; rank: number };
  getLeaderboard: (limit: number) => LeaderboardEntry[];
  close: () => void;
}

export function createDatabase(dbPath: string = process.env.DB_PATH ?? './data/scores.db'): ScoreDatabase {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      level TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      gems INTEGER NOT NULL,
      kills INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC, duration_sec ASC);
  `);

  const insertStmt = db.prepare(`
    INSERT INTO scores (name, score, level, duration_sec, gems, kills)
    VALUES (@name, @score, @level, @durationSec, @gems, @kills)
  `);

  const rankStmt = db.prepare(`
    SELECT COUNT(*) AS betterCount
    FROM scores
    WHERE score > @score
       OR (score = @score AND duration_sec < @durationSec)
       OR (score = @score AND duration_sec = @durationSec AND id < @id)
  `);

  const leaderboardStmt = db.prepare(`
    SELECT name, score, level, duration_sec AS durationSec, created_at AS createdAt
    FROM scores
    ORDER BY score DESC, duration_sec ASC, id ASC
    LIMIT ?
  `);

  return {
    db,
    insertScore(submission: ScoreSubmission): { id: number; rank: number } {
      const info = insertStmt.run(submission);
      const id = Number(info.lastInsertRowid);
      const row = rankStmt.get({
        score: submission.score,
        durationSec: submission.durationSec,
        id,
      }) as { betterCount: number } | undefined;
      const rank = (row?.betterCount ?? 0) + 1;
      return { id, rank };
    },
    getLeaderboard(limit: number): LeaderboardEntry[] {
      const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
      const rows = leaderboardStmt.all(safeLimit) as Array<{
        name: string;
        score: number;
        level: LevelId;
        durationSec: number;
        createdAt: string;
      }>;
      return rows.map((r, index) => ({
        rank: index + 1,
        name: r.name,
        score: r.score,
        level: r.level,
        durationSec: r.durationSec,
        createdAt: r.createdAt,
      }));
    },
    close(): void {
      db.close();
    },
  };
}
