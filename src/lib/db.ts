import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function openDatabase(filename: string) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      digest TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chunks (
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL,
      PRIMARY KEY (document_id, position)
    );
  `);
  return db;
}

let connection: Database.Database | undefined;
export function getDatabase() {
  return connection ??= openDatabase(path.resolve("data/rag.sqlite"));
}
