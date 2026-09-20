import * as Speech from 'expo-speech';
import { AppStorage } from '../storage';

export type SpeechSpeed = 'slow' | 'normal' | 'fast';

export const SPEECH_RATES: Record<SpeechSpeed, number> = {
  slow: 0.65,
  normal: 0.85,
  fast: 1.1,
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

  static async speak(text: string, options?: SpeakOptions): Promise<void> {
    Speech.stop();
    const rate = options?.rate ?? (await this.getRate());
    Speech.speak(text, {
      language: options?.language ?? 'en-US',
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
