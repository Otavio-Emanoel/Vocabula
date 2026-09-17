export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'idiom'
  | 'phrase';

export interface WordExample {
  sentence: string;
  context?: string;
  translation?: string;
}

export interface WordDefinition {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: PartOfSpeech;
  shortDefinition: string;
  detailedExplanation: string;
  examples: WordExample[];
  translations?: Record<string, string>;
  etymology?: string;
  difficultyLevel: 1 | 2 | 3 | 4;
  tags?: string[];
}
