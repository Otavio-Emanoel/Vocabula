import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  IS_INITIALIZED: 'app.is_initialized',
  SCHEMA_VERSION: 'app.schema_version',
  NOTIFICATION_TIME: 'settings.notification_time',
  NOTIFICATIONS_ENABLED: 'settings.notifications_enabled',
  DAILY_TARGET: 'settings.daily_target',
  TTS_RATE: 'settings.tts_rate',
  TTS_PITCH: 'settings.tts_pitch',
  NOTIFICATION_FREQUENCY: 'settings.notification_frequency',
  WIDGET_WORD_CACHE: 'widget.word_cache',
  CURRENT_STREAK: 'stats.current_streak',
  LAST_ACTIVE_DATE: 'stats.last_active_date',
  RECENT_SEARCHES: 'search.recent_searches',
} as const;

export const AppStorage = {
  async isInitialized(): Promise<boolean> {
    const val = await AsyncStorage.getItem(StorageKeys.IS_INITIALIZED);
    return val === 'true';
  },

  async setInitialized(value: boolean): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.IS_INITIALIZED, value ? 'true' : 'false');
  },

  async isNotificationsEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(StorageKeys.NOTIFICATIONS_ENABLED);
    return val !== 'false'; // Defaults to enabled (true)
  },

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.NOTIFICATIONS_ENABLED, enabled ? 'true' : 'false');
  },

  async getNotificationTime(): Promise<string> {
    const val = await AsyncStorage.getItem(StorageKeys.NOTIFICATION_TIME);
    return val ?? '08:30';
  },

  async setNotificationTime(time: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.NOTIFICATION_TIME, time);
  },

  async getNotificationFrequency(): Promise<number> {
    const val = await AsyncStorage.getItem(StorageKeys.NOTIFICATION_FREQUENCY);
    return val ? parseInt(val, 10) : 1;
  },

  async setNotificationFrequency(frequency: number): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.NOTIFICATION_FREQUENCY, frequency.toString());
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

  async getTTSRate(): Promise<number> {
    const val = await AsyncStorage.getItem(StorageKeys.TTS_RATE);
    return val ? parseFloat(val) : 0.85;
  },

  async setTTSRate(rate: number): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.TTS_RATE, rate.toString());
  },

  async getRecentSearches(): Promise<string[]> {
    try {
      const val = await AsyncStorage.getItem(StorageKeys.RECENT_SEARCHES);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  },

  async addRecentSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    try {
      const existing = await this.getRecentSearches();
      const filtered = existing.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      await AsyncStorage.setItem(StorageKeys.RECENT_SEARCHES, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save recent search:', err);
    }
  },

  async clearRecentSearches(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.RECENT_SEARCHES);
  },
};

