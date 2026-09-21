import { Share } from 'react-native';
import { getDatabase } from '../../db/client';

export interface BackupData {
  vocabula_version: string;
  exported_at: string;
  summary: {
    decks_count: number;
    deck_words_count: number;
    progress_count: number;
    review_logs_count: number;
  };
  decks: any[];
  deck_words: any[];
  progress: any[];
  review_logs: any[];
}

export class BackupService {
  /**
   * Generates a complete offline JSON backup of user progress, decks, and review logs.
   */
  static async generateBackup(): Promise<BackupData> {
    const db = await getDatabase();

    const [decks, deckWords, progress, reviewLogs] = await Promise.all([
      db.getAllAsync<any>('SELECT * FROM user_decks;'),
      db.getAllAsync<any>('SELECT * FROM deck_words;'),
      db.getAllAsync<any>('SELECT * FROM user_word_progress;'),
      db.getAllAsync<any>('SELECT * FROM review_logs ORDER BY reviewed_at DESC LIMIT 500;'),
    ]);

    return {
      vocabula_version: '1.0.0',
      exported_at: new Date().toISOString(),
      summary: {
        decks_count: decks.length,
        deck_words_count: deckWords.length,
        progress_count: progress.length,
        review_logs_count: reviewLogs.length,
      },
      decks,
      deck_words: deckWords,
      progress,
      review_logs: reviewLogs,
    };
  }

  /**
   * Triggers native OS share modal to save or transmit the user's offline JSON backup.
   */
  static async shareBackup(): Promise<void> {
    const backup = await this.generateBackup();
    const jsonString = JSON.stringify(backup, null, 2);

    await Share.share({
      message: jsonString,
      title: `Vocabula_Backup_${new Date().toISOString().slice(0, 10)}.json`,
    });
  }

  /**
   * Retrieves summary counts for user data available for backup.
   */
  static async getBackupSummary(): Promise<{
    decksCount: number;
    savedCount: number;
    reviewsCount: number;
  }> {
    const db = await getDatabase();
    const [decksRow, savedRow, reviewsRow] = await Promise.all([
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM user_decks;'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM user_word_progress WHERE is_starred = 1;'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM review_logs;'),
    ]);

    return {
      decksCount: decksRow?.count ?? 0,
      savedCount: savedRow?.count ?? 0,
      reviewsCount: reviewsRow?.count ?? 0,
    };
  }

  /**
   * Imports and restores a backup JSON string offline.
   * Supports 'merge' (safe union) or 'replace' (clean restore).
   */
  static async importBackup(
    jsonString: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ restoredDecks: number; restoredProgress: number }> {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file: not an object');
    }
    if (!data.vocabula_version && !data.vocabulaVersion) {
      throw new Error('Unrecognized backup format: missing Vocabula version');
    }

    const decks: any[] = data.decks || data.customDecks || [];
    const deckWords: any[] = data.deck_words || [];
    const progress: any[] = data.progress || [];
    const reviewLogs: any[] = data.review_logs || [];

    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      if (mode === 'replace') {
        await db.runAsync('DELETE FROM deck_words;');
        await db.runAsync('DELETE FROM user_decks;');
        await db.runAsync('DELETE FROM user_word_progress;');
        await db.runAsync('DELETE FROM review_logs;');
      }

      // Restore Decks
      for (const d of decks) {
        if (d.id && d.name) {
          await db.runAsync(
            `INSERT INTO user_decks (id, name, description, created_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               description = excluded.description;`,
            d.id,
            d.name,
            d.description ?? '',
            d.created_at ?? Date.now()
          );
        }
      }

      // Restore Deck Words
      for (const dw of deckWords) {
        if (dw.deck_id && dw.word_id) {
          await db.runAsync(
            `INSERT INTO deck_words (deck_id, word_id, added_at)
             VALUES (?, ?, ?)
             ON CONFLICT(deck_id, word_id) DO NOTHING;`,
            dw.deck_id,
            dw.word_id,
            dw.added_at ?? Date.now()
          );
        }
      }

      // Restore User Progress
      for (const p of progress) {
        if (p.word_id || p.wordId) {
          const wordId = p.word_id || p.wordId;
          const status = p.status ?? 'new';
          const easeFactor = p.ease_factor ?? p.easeFactor ?? 2.5;
          const intervalDays = p.interval_days ?? p.intervalDays ?? 0;
          const repetitionNumber = p.repetition_number ?? p.repetitionNumber ?? 0;
          const nextReviewAt = p.next_review_at ?? p.nextReviewAt ?? Date.now();
          const lastReviewedAt = p.last_reviewed_at ?? p.lastReviewedAt ?? null;
          const isStarred = (p.is_starred ?? p.isStarred) ? 1 : 0;

          await db.runAsync(
            `INSERT INTO user_word_progress (
               word_id, status, ease_factor, interval_days, repetition_number, next_review_at, last_reviewed_at, is_starred
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(word_id) DO UPDATE SET
               status = CASE WHEN excluded.repetition_number >= user_word_progress.repetition_number THEN excluded.status ELSE user_word_progress.status END,
               ease_factor = CASE WHEN excluded.repetition_number >= user_word_progress.repetition_number THEN excluded.ease_factor ELSE user_word_progress.ease_factor END,
               interval_days = MAX(user_word_progress.interval_days, excluded.interval_days),
               repetition_number = MAX(user_word_progress.repetition_number, excluded.repetition_number),
               is_starred = MAX(user_word_progress.is_starred, excluded.is_starred);`,
            wordId,
            status,
            easeFactor,
            intervalDays,
            repetitionNumber,
            nextReviewAt,
            lastReviewedAt,
            isStarred
          );
        }
      }

      // Restore Review Logs (insert up to 200 logs)
      for (const log of reviewLogs.slice(0, 200)) {
        if (log.word_id || log.wordId) {
          await db.runAsync(
            `INSERT INTO review_logs (word_id, grade, interval_before, interval_after, reviewed_at)
             VALUES (?, ?, ?, ?, ?);`,
            log.word_id || log.wordId,
            log.grade ?? 4,
            log.interval_before ?? log.intervalBefore ?? 0,
            log.interval_after ?? log.intervalAfter ?? 1,
            log.reviewed_at ?? log.reviewedAt ?? Date.now()
          );
        }
      }
    });

    return {
      restoredDecks: decks.length,
      restoredProgress: progress.length,
    };
  }
}
