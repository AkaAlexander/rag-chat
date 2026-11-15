import type Database from "better-sqlite3";

export interface DocumentSummary {
  id: number;
  name: string;
  chunks: number;
}

export function listDocuments(db: Database.Database) {
  return db.prepare(`
    SELECT d.id, d.name, COUNT(c.position) AS chunks FROM documents d
    JOIN chunks c ON c.document_id = d.id GROUP BY d.id ORDER BY d.id DESC
  `).all() as DocumentSummary[];
}

export function saveDocument(db: Database.Database, name: string, content: string,
  digest: string, chunks: string[], vectors: number[][]) {
  if (!chunks.length || chunks.length !== vectors.length ||
      vectors.some(v => v.length !== 384 || !v.every(Number.isFinite))) {
    throw new Error("Invalid embeddings");
  }
  return db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO documents (name, content, digest) VALUES (?, ?, ?) ON CONFLICT(digest) DO NOTHING
    `).run(name, content, digest);
    if (!result.changes) return false;
    const insert = db.prepare("INSERT INTO chunks (document_id, position, content, embedding) VALUES (?, ?, ?, ?)");
    chunks.forEach((text, i) => insert.run(result.lastInsertRowid, i, text, JSON.stringify(vectors[i])));
    return true;
  })();
}
