export type WordStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface UserWordProgress {
  wordId: string;
  status: WordStatus;
  easeFactor: number;       // Default: 2.5, Min: 1.3
  intervalDays: number;     // Days until next review
  repetitionNumber: number; // Consecutive successful repetitions
  nextReviewAt: number;     // Milliseconds Unix epoch
  lastReviewedAt?: number;  // Milliseconds Unix epoch
  isStarred: boolean;
}

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewLog {
  id?: number;
  wordId: string;
  grade: ReviewGrade;
  intervalBefore: number;
  intervalAfter: number;
  reviewedAt: number;
}
