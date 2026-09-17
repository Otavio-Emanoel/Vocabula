import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppStorage } from '../storage';
import { getUpcomingWordsForScheduling } from '../../db/queries';

// Configure notification presentation when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-lexipulse', {
          name: 'Daily LexiPulse Words',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });
      }

      return finalStatus === 'granted';
    } catch (err) {
      console.warn('Notification permission error:', err);
      return false;
    }
  },

  async scheduleRollingNotifications(): Promise<void> {
    try {
      const isEnabled = await AppStorage.isNotificationsEnabled();
      if (!isEnabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
      }

      const hasPerm = await this.requestPermissions();
      if (!hasPerm) return;

      // Cancel previous scheduled queue
      await Notifications.cancelAllScheduledNotificationsAsync();

      const timeStr = await AppStorage.getNotificationTime(); // e.g. "08:30"
      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr || '8', 10);
      const minute = parseInt(minuteStr || '30', 10);

      const words = await getUpcomingWordsForScheduling(14);
      if (!words || words.length === 0) return;

      // Schedule for the next 7 days
      const now = new Date();
      for (let dayOffset = 1; dayOffset <= Math.min(words.length, 7); dayOffset++) {
        const word = words[dayOffset - 1];
        const triggerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `LexiPulse: ${word.word}`,
            subtitle: word.phonetic,
            body: `${word.shortDefinition}\n"${word.examples[0]?.sentence || ''}"`,
            data: { wordId: word.id },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    } catch (err) {
      console.warn('Failed to schedule rolling notifications:', err);
    }
  },

  async sendTestNotification(): Promise<boolean> {
    try {
      const hasPerm = await this.requestPermissions();
      if (!hasPerm) return false;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ LexiPulse: Sonder',
          subtitle: '/ˈsɒn.dər/ • noun',
          body: 'The profound feeling of realizing that everyone, including strangers, has a life as vivid and complex as your own.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          repeats: false,
        },
      });

      return true;
    } catch (err) {
      console.warn('Failed to send test notification:', err);
      return false;
    }
  },
};

