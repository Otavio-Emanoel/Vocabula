import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'lexipulse-storage',
});

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
  isInitialized(): boolean {
    return storage.getBoolean(StorageKeys.IS_INITIALIZED) ?? false;
  },

  setInitialized(value: boolean): void {
    storage.set(StorageKeys.IS_INITIALIZED, value);
  },

  getNotificationTime(): string {
    return storage.getString(StorageKeys.NOTIFICATION_TIME) ?? '08:30';
  },

  setNotificationTime(time: string): void {
    storage.set(StorageKeys.NOTIFICATION_TIME, time);
  },

  getDailyTarget(): number {
    return storage.getNumber(StorageKeys.DAILY_TARGET) ?? 1;
  },

  setDailyTarget(target: number): void {
    storage.set(StorageKeys.DAILY_TARGET, target);
  },

  getStreak(): number {
    return storage.getNumber(StorageKeys.CURRENT_STREAK) ?? 0;
  },

  setStreak(streak: number): void {
    storage.set(StorageKeys.CURRENT_STREAK, streak);
  },

  getLastActiveDate(): string {
    return storage.getString(StorageKeys.LAST_ACTIVE_DATE) ?? '';
  },

  setLastActiveDate(date: string): void {
    storage.set(StorageKeys.LAST_ACTIVE_DATE, date);
  },
};
