import { getDatabase } from './client';
import { WordDefinition, PartOfSpeech } from '../types/dictionary';
import { UserWordProgress, ReviewGrade, WordStatus } from '../types/srs';

interface WordRow {
  id: string;
  word: string;
  phonetic: string;
  part_of_speech: string;
  short_definition: string;
  detailed_explanation: string;
  examples_json: string;
  translations_json: string | null;
  etymology: string | null;
  difficulty_level: number;
  tags_csv: string | null;
}

interface ProgressRow {
  word_id: string;
  status: string;
  ease_factor: number;
  interval_days: number;
  repetition_number: number;
  next_review_at: number;
  last_reviewed_at: number | null;
  is_starred: number;
}

function parseWordRow(row: WordRow): WordDefinition {
  return {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic,
    partOfSpeech: row.part_of_speech as PartOfSpeech,
    shortDefinition: row.short_definition,
    detailedExplanation: row.detailed_explanation,
    examples: row.examples_json ? JSON.parse(row.examples_json) : [],
    translations: row.translations_json ? JSON.parse(row.translations_json) : undefined,
    etymology: row.etymology || undefined,
    difficultyLevel: row.difficulty_level as 1 | 2 | 3 | 4,
    tags: row.tags_csv ? row.tags_csv.split(',').filter(Boolean) : [],
  };
}

function parseProgressRow(row: ProgressRow): UserWordProgress {
  return {
    wordId: row.word_id,
    status: row.status as WordStatus,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitionNumber: row.repetition_number,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at || undefined,
    isStarred: row.is_starred === 1,
  };
}

export async function searchWords(query: string, limit: number = 25): Promise<WordDefinition[]> {
  const db = await getDatabase();
  const trimmed = query.trim();

  if (!trimmed) {
    const rows = await db.getAllAsync<WordRow>(
      'SELECT * FROM words ORDER BY word ASC LIMIT ?;',
      limit
    );
    return rows.map(parseWordRow);
  }

  // FTS5 prefix search
  const rows = await db.getAllAsync<WordRow>(
    `SELECT w.*
     FROM words w
     JOIN words_fts fts ON w.id = fts.id
     WHERE words_fts MATCH ? || '*'
     ORDER BY rank
     LIMIT ?;`,
    trimmed,
    limit
  );

  return rows.map(parseWordRow);
}

export async function getWordById(
  id: string
): Promise<{ word: WordDefinition; progress?: UserWordProgress } | null> {
  const db = await getDatabase();

  const wordRow = await db.getFirstAsync<WordRow>(
    'SELECT * FROM words WHERE id = ?;',
    id
  );

  if (!wordRow) return null;

  const progressRow = await db.getFirstAsync<ProgressRow>(
    'SELECT * FROM user_word_progress WHERE word_id = ?;',
    id
  );

  return {
    word: parseWordRow(wordRow),
    progress: progressRow ? parseProgressRow(progressRow) : undefined,
  };
}

export async function getWordOfTheDay(): Promise<WordDefinition | null> {
  const db = await getDatabase();

  // Day-based deterministic selection from words
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM words;'
  );

  const total = countRow?.count ?? 0;
  if (total === 0) return null;

  // Day of year calculation for stability
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const offset = dayOfYear % total;

  const row = await db.getFirstAsync<WordRow>(
    'SELECT * FROM words ORDER BY word ASC LIMIT 1 OFFSET ?;',
    offset
  );

  return row ? parseWordRow(row) : null;
}

export async function getUpcomingWordsForScheduling(limit: number = 14): Promise<WordDefinition[]> {
  const db = await getDatabase();

  // Prefer words due for SRS review first, then new unread words
  const rows = await db.getAllAsync<WordRow>(
    `SELECT w.*
     FROM words w
     LEFT JOIN user_word_progress p ON w.id = p.word_id
     ORDER BY
       CASE WHEN p.status != 'new' AND p.next_review_at <= ? THEN 0 ELSE 1 END,
       p.next_review_at ASC,
       w.difficulty_level ASC
     LIMIT ?;`,
    Date.now(),
    limit
  );

  return rows.map(parseWordRow);
}

export async function getDueSRSWords(
  limit: number = 20
): Promise<Array<{ word: WordDefinition; progress: UserWordProgress }>> {
  const db = await getDatabase();

  type CombinedRow = WordRow & ProgressRow;

  const rows = await db.getAllAsync<CombinedRow>(
    `SELECT w.*, p.status, p.ease_factor, p.interval_days, p.repetition_number,
            p.next_review_at, p.last_reviewed_at, p.is_starred
     FROM user_word_progress p
     JOIN words w ON p.word_id = w.id
     WHERE p.status != 'mastered' AND p.next_review_at <= ?
     ORDER BY p.next_review_at ASC
     LIMIT ?;`,
    Date.now(),
    limit
  );

  return rows.map((r) => ({
    word: parseWordRow(r),
    progress: parseProgressRow(r),
  }));
}

export async function toggleStarWord(wordId: string): Promise<boolean> {
  const db = await getDatabase();

  const current = await db.getFirstAsync<{ is_starred: number }>(
    'SELECT is_starred FROM user_word_progress WHERE word_id = ?;',
    wordId
  );

  const newState = current?.is_starred === 1 ? 0 : 1;

  await db.runAsync(
    `INSERT INTO user_word_progress (word_id, is_starred, next_review_at)
     VALUES (?, ?, ?)
     ON CONFLICT(word_id) DO UPDATE SET is_starred = ?;`,
    wordId,
    newState,
    Date.now(),
    newState
  );

  return newState === 1;
}

export async function recordReviewProgress(
  wordId: string,
  grade: ReviewGrade,
  easeFactor: number,
  intervalDays: number,
  repetitionNumber: number,
  nextReviewAt: number,
  status: WordStatus
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  const currentProgress = await db.getFirstAsync<{ interval_days: number }>(
    'SELECT interval_days FROM user_word_progress WHERE word_id = ?;',
    wordId
  );

  const intervalBefore = currentProgress?.interval_days ?? 0;

  await db.withTransactionAsync(async () => {
    // 1. Update user word progress
    await db.runAsync(
      `INSERT INTO user_word_progress (
        word_id, status, ease_factor, interval_days,
        repetition_number, next_review_at, last_reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        status = ?,
        ease_factor = ?,
        interval_days = ?,
        repetition_number = ?,
        next_review_at = ?,
        last_reviewed_at = ?;`,
      wordId, status, easeFactor, intervalDays, repetitionNumber, nextReviewAt, now,
      status, easeFactor, intervalDays, repetitionNumber, nextReviewAt, now
    );

    // 2. Insert audit log
    await db.runAsync(
      `INSERT INTO review_logs (
        word_id, grade, interval_before, interval_after, reviewed_at
      ) VALUES (?, ?, ?, ?, ?);`,
      wordId, grade, intervalBefore, intervalDays, now
    );
  });
}
