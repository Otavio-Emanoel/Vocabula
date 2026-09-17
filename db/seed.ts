import { getDatabase } from './client';
import { SCHEMA_STATEMENTS } from './schema';
import { AppStorage } from '../services/storage';
import wordsSeed from '../assets/data/words.json';
import { WordDefinition } from '../types/dictionary';

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  // 1. Run Schema Statements
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
  }

  // 2. Hydrate from bundled words.json (idempotent: inserts any newly added words)
  const words = wordsSeed as WordDefinition[];
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const item of words) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM words WHERE id = ?;',
        item.id
      );

      if (!existing) {
        const examplesJson = JSON.stringify(item.examples || []);
        const translationsJson = item.translations ? JSON.stringify(item.translations) : null;
        const tagsCsv = (item.tags || []).join(',');

        // Insert into master words table
        await db.runAsync(
          `INSERT INTO words (
            id, word, phonetic, part_of_speech, short_definition,
            detailed_explanation, examples_json, translations_json,
            etymology, difficulty_level, tags_csv
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          item.id,
          item.word,
          item.phonetic,
          item.partOfSpeech,
          item.shortDefinition,
          item.detailedExplanation,
          examplesJson,
          translationsJson,
          item.etymology || null,
          item.difficultyLevel,
          tagsCsv
        );

        // Insert into FTS5 virtual table
        await db.runAsync(
          `INSERT INTO words_fts (
            id, word, short_definition, detailed_explanation, tags_csv
          ) VALUES (?, ?, ?, ?, ?);`,
          item.id,
          item.word,
          item.shortDefinition,
          item.detailedExplanation,
          tagsCsv
        );

        // Initialize default user word progress
        await db.runAsync(
          `INSERT OR IGNORE INTO user_word_progress (
            word_id, status, ease_factor, interval_days,
            repetition_number, next_review_at, is_starred
          ) VALUES (?, 'new', 2.5, 0, 0, ?, 0);`,
          item.id,
          now
        );
      }
    }

    // 3. Create starter decks if none exist
    const decksCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_decks;'
    );

    if ((decksCount?.count ?? 0) === 0) {
      const defaultDecks = [
        {
          id: 'deck_favorites',
          name: 'Favorites',
          description: 'Words that resonated with you',
        },
        {
          id: 'deck_literary',
          name: 'Poetic & Literary',
          description: 'Evocative, aesthetic, and untranslatable expressions',
        },
        {
          id: 'deck_philosophy',
          name: 'Philosophy & Mind',
          description: 'Concepts exploring perception, time, and consciousness',
        },
      ];

      for (const deck of defaultDecks) {
        await db.runAsync(
          'INSERT INTO user_decks (id, name, description, created_at) VALUES (?, ?, ?, ?);',
          deck.id,
          deck.name,
          deck.description,
          now
        );
      }
    }
  });

  await AppStorage.setInitialized(true);
}

