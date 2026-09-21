import * as Speech from 'expo-speech';
import { AppStorage } from '../storage';

export type SpeechSpeed = 'slow' | 'normal' | 'fast';
export type SpeechDialect = 'en-US' | 'en-GB' | 'en-AU';

export const SPEECH_RATES: Record<SpeechSpeed, number> = {
  slow: 0.65,
  normal: 0.85,
  fast: 1.1,
};

export const SPEECH_DIALECTS: Record<SpeechDialect, string> = {
  'en-US': 'American (US)',
  'en-GB': 'British (UK)',
  'en-AU': 'Australian (AU)',
};

export interface SpeakOptions {
  rate?: number;
  language?: string;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: any) => void;
}

export class SpeechService {
  private static cachedRate: number | null = null;
  private static cachedLanguage: string | null = null;

  static async getRate(): Promise<number> {
    if (this.cachedRate !== null) {
      return this.cachedRate;
    }
    const rate = await AppStorage.getTTSRate();
    this.cachedRate = rate;
    return rate;
  }

  static async setRate(rate: number): Promise<void> {
    this.cachedRate = rate;
    await AppStorage.setTTSRate(rate);
  }

  static async setSpeed(speed: SpeechSpeed): Promise<void> {
    const rate = SPEECH_RATES[speed];
    await this.setRate(rate);
  }

  static async getLanguage(): Promise<string> {
    if (this.cachedLanguage !== null) {
      return this.cachedLanguage;
    }
    const lang = await AppStorage.getTTSLanguage();
    this.cachedLanguage = lang;
    return lang;
  }

  static async setLanguage(lang: SpeechDialect): Promise<void> {
    this.cachedLanguage = lang;
    await AppStorage.setTTSLanguage(lang);
  }

  static async speak(text: string, options?: SpeakOptions): Promise<void> {
    Speech.stop();
    const [rate, language] = await Promise.all([
      options?.rate ?? this.getRate(),
      options?.language ?? this.getLanguage(),
    ]);

    Speech.speak(text, {
      language,
      rate,
      pitch: options?.pitch ?? 1.0,
      onDone: options?.onDone,
      onError: options?.onError,
    });
  }

  static stop(): void {
    Speech.stop();
  }
}
