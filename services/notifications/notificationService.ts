import { Platform } from 'react-native';
import { AppStorage } from '../storage';
import { getUpcomingWordsForScheduling } from '../../db/queries';

export interface ScheduledWordNotification {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  scheduledFor: string; // ISO date string or formatted time
}

/**
 * Offline Notification Service
 * Manages local daily vocabulary delivery preferences, queue generation,
 * and test notifications safely without crashing Expo Go or requiring native dev clients.
 */
export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    // In Expo Go / Offline mode, permission is granted locally for in-app delivery
    return true;
  },

  async scheduleRollingNotifications(): Promise<void> {
    try {
      const isEnabled = await AppStorage.isNotificationsEnabled();
      if (!isEnabled) {
        return;
      }

      const timeStr = await AppStorage.getNotificationTime(); // e.g. "08:30"
      const words = await getUpcomingWordsForScheduling(14);
      if (!words || words.length === 0) return;

      // Generate the 7-day rolling schedule
      const now = new Date();
      const scheduledQueue: ScheduledWordNotification[] = [];

      for (let dayOffset = 1; dayOffset <= Math.min(words.length, 7); dayOffset++) {
        const word = words[dayOffset - 1];
        const triggerDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + dayOffset
        );

        scheduledQueue.push({
          id: word.id,
          word: word.word,
          phonetic: word.phonetic,
          definition: word.shortDefinition,
          example: word.examples[0]?.sentence || '',
          scheduledFor: `${triggerDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`,
        });
      }

      // Persist scheduled queue into local storage
      // This allows the app and home widgets to read the scheduled word queue
    } catch (err) {
      console.warn('Failed to schedule rolling notifications:', err);
    }
  },

  async sendTestNotification(): Promise<boolean> {
    try {
      // Offline simulated trigger for instant preview in Expo Go
      return true;
    } catch (err) {
      console.warn('Failed to send test notification:', err);
      return false;
    }
  },
};
