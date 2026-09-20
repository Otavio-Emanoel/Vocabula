import { WordDefinition } from '../../types/dictionary';
import { AppStorage } from '../storage';

/**
 * Deterministic offline Word of the Day and Daily Streak service.
 */
export class DailyService {
  /**
   * Deterministically select today's Word of the Day from the dictionary offline.
   * Uses the current date (YYYY-MM-DD) to compute a stable index.
   */
  static getWordOfTheDay(words: WordDefinition[]): WordDefinition | null {
    if (!words || words.length === 0) return null;

    const today = new Date();
    // Compute day of the year or deterministic integer hash from date string
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
    }

    const index = hash % words.length;
    return words[index];
  }

  /**
   * Records daily activity, updating streak counts and last active date in local storage.
   */
  static async recordDailyActivity(): Promise<{ streak: number; isNewDay: boolean }> {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    const [lastActiveDate, currentStreak] = await Promise.all([
      AppStorage.getLastActiveDate(),
      AppStorage.getStreak(),
    ]);

    if (lastActiveDate === todayStr) {
      return { streak: Math.max(currentStreak, 1), isNewDay: false };
    }

    let newStreak = 1;

    if (lastActiveDate) {
      const lastDate = new Date(lastActiveDate);
      const currentDate = new Date(todayStr);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    await Promise.all([
      AppStorage.setStreak(newStreak),
      AppStorage.setLastActiveDate(todayStr),
    ]);

    return { streak: newStreak, isNewDay: true };
  }
}
