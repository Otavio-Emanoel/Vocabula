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
}
