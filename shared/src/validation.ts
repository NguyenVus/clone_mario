import { z } from 'zod';
import type { LevelId } from './types.js';

export const LEVEL_IDS: readonly [LevelId, ...LevelId[]] = ['1-1', '1-2', '1-3'];

const BANNED_WORDS = [
  'admin',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cunt',
  'nigger',
  'faggot',
  'dm',
  'ditme',
  'vcl',
  'vl',
  'cc',
  'cac',
  'lon',
  'buoi',
] as const;

// Allows Unicode letters (including Vietnamese diacritics), digits, spaces, _ and -
const NAME_REGEX = /^[\p{L}\p{N} _-]+$/u;

export function containsBannedWord(input: string): boolean {
  const normalized = input.toLowerCase().replace(/[\s_-]+/g, '');
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

export const scoreSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên không được để trống')
    .max(16, 'Tên tối đa 16 ký tự')
    .refine((val) => NAME_REGEX.test(val), {
      message: 'Tên chỉ được chứa chữ cái, số, khoảng trắng, _ hoặc -',
    })
    .refine((val) => !containsBannedWord(val), {
      message: 'Tên chứa từ không phù hợp',
    }),
  score: z.number().int().min(0).max(10_000_000),
  level: z.enum(LEVEL_IDS),
  durationSec: z.number().int().min(1).max(86_400),
  gems: z.number().int().min(0).max(10_000),
  kills: z.number().int().min(0).max(10_000),
});

export type ValidatedScoreSubmission = z.infer<typeof scoreSubmissionSchema>;
