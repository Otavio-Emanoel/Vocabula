export interface SM2Input {
  grade: 0 | 1 | 2 | 3 | 4 | 5;
  repetitionNumber: number;
  easeFactor: number;
  intervalDays: number;
}

export interface SM2Output {
  repetitionNumber: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: number; // Unix timestamp in milliseconds
  status: 'learning' | 'reviewing' | 'mastered';
}

const MINIMUM_EASE_FACTOR = 1.3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateSM2(input: SM2Input, reviewTimestamp: number = Date.now()): SM2Output {
  const { grade } = input;
  let { repetitionNumber, easeFactor, intervalDays } = input;

  // 1. Calculate new Ease Factor
  const newEaseFactor = Math.max(
    MINIMUM_EASE_FACTOR,
    easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  // 2. Calculate new interval and repetition number
  if (grade >= 3) {
    if (repetitionNumber === 0) {
      intervalDays = 1;
    } else if (repetitionNumber === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * newEaseFactor);
    }
    repetitionNumber += 1;
  } else {
    // Failed recall: reset repetition counter and schedule for tomorrow
    repetitionNumber = 0;
    intervalDays = 1;
  }

  // 3. Determine status
  let status: 'learning' | 'reviewing' | 'mastered' = 'learning';
  if (intervalDays >= 60) {
    status = 'mastered';
  } else if (repetitionNumber >= 2) {
    status = 'reviewing';
  }

  const nextReviewAt = reviewTimestamp + intervalDays * DAY_IN_MS;

  return {
    repetitionNumber,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    intervalDays,
    nextReviewAt,
    status,
  };
}
