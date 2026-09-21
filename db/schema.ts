export const SCHEMA_STATEMENTS = [
  // 1. Words Master Table
  `CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY NOT NULL,
    word TEXT NOT NULL,
    phonetic TEXT NOT NULL,
    part_of_speech TEXT NOT NULL,
    short_definition TEXT NOT NULL,
    detailed_explanation TEXT NOT NULL,
    examples_json TEXT NOT NULL,
    translations_json TEXT,
    etymology TEXT,
    difficulty_level INTEGER NOT NULL DEFAULT 1,
    tags_csv TEXT
  );`,

  // Words Indexes
  `CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);`,
  `CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_level);`,

  // 2. Full-Text Search (FTS5) Table
  `CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
    id UNINDEXED,
    word,
    short_definition,
    detailed_explanation,
    tags_csv,
    tokenize = 'unicode61 remove_diacritics 1'
  );`,

  // 3. User Word Progress (SM-2 State)
  `CREATE TABLE IF NOT EXISTS user_word_progress (
    word_id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetition_number INTEGER NOT NULL DEFAULT 0,
    next_review_at INTEGER NOT NULL,
    last_reviewed_at INTEGER,
    is_starred INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
  );`,

  // Progress Indexes
  `CREATE INDEX IF NOT EXISTS idx_progress_next_review ON user_word_progress(next_review_at);`,
  `CREATE INDEX IF NOT EXISTS idx_progress_status ON user_word_progress(status);`,
  `CREATE INDEX IF NOT EXISTS idx_progress_starred ON user_word_progress(is_starred);`,

  // 4. Review Logs
  `CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id TEXT NOT NULL,
    grade INTEGER NOT NULL,
    interval_before INTEGER NOT NULL,
    interval_after INTEGER NOT NULL,
    reviewed_at INTEGER NOT NULL,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
  );`,

  `CREATE INDEX IF NOT EXISTS idx_logs_reviewed_at ON review_logs(reviewed_at);`,

  // 5. User Custom Decks
  `CREATE TABLE IF NOT EXISTS user_decks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
  );`,

  // 6. Deck Words Association
  `CREATE TABLE IF NOT EXISTS deck_words (
    deck_id TEXT NOT NULL,
    word_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (deck_id, word_id),
    FOREIGN KEY(deck_id) REFERENCES user_decks(id) ON DELETE CASCADE,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
  );`,

  // 7. User Word Notes (Mnemonics & Context Anchors)
  `CREATE TABLE IF NOT EXISTS user_word_notes (
    word_id TEXT PRIMARY KEY NOT NULL,
    note TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
  );`
];

