import { DatabaseSync } from "node:sqlite";

export type AppDatabase = DatabaseSync;

export function createDatabase(path: string): AppDatabase {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manual_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
