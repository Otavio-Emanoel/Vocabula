import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  IS_INITIALIZED: 'app.is_initialized',
  SCHEMA_VERSION: 'app.schema_version',
  NOTIFICATION_TIME: 'settings.notification_time',
  NOTIFICATIONS_ENABLED: 'settings.notifications_enabled',
  DAILY_TARGET: 'settings.daily_target',
  TTS_RATE: 'settings.tts_rate',
  TTS_PITCH: 'settings.tts_pitch',
  WIDGET_WORD_CACHE: 'widget.word_cache',
  CURRENT_STREAK: 'stats.current_streak',
  LAST_ACTIVE_DATE: 'stats.last_active_date',
} as const;

export const AppStorage = {
  async isInitialized(): Promise<boolean> {
    const val = await AsyncStorage.getItem(StorageKeys.IS_INITIALIZED);
    return val === 'true';
  },

  async setInitialized(value: boolean): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.IS_INITIALIZED, value ? 'true' : 'false');
  },

  async getNotificationTime(): Promise<string> {
    const val = await AsyncStorage.getItem(StorageKeys.NOTIFICATION_TIME);
    return val ?? '08:30';
  },

  async setNotificationTime(time: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.NOTIFICATION_TIME, time);
  },

  async getDailyTarget(): Promise<number> {
    const val = await AsyncStorage.getItem(StorageKeys.DAILY_TARGET);
    return val ? parseInt(val, 10) : 1;
  },

  async setDailyTarget(target: number): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.DAILY_TARGET, target.toString());
  },

  async getStreak(): Promise<number> {
    const val = await AsyncStorage.getItem(StorageKeys.CURRENT_STREAK);
    return val ? parseInt(val, 10) : 0;
  },

  async setStreak(streak: number): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.CURRENT_STREAK, streak.toString());
  },

  async getLastActiveDate(): Promise<string> {
    return (await AsyncStorage.getItem(StorageKeys.LAST_ACTIVE_DATE)) ?? '';
  },

  async setLastActiveDate(date: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.LAST_ACTIVE_DATE, date);
  },
};
