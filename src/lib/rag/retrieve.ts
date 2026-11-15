import { getDatabase } from "../db";
import { embedTexts } from "./embeddings";

export interface Source {
  name: string;
  position: number;
  content: string;
}

interface StoredChunk extends Source { embedding: string }

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export function rankChunks(query: number[], rows: StoredChunk[], threshold = 0.35, limit = 4): Source[] {
  return rows.map(row => ({ row, score: cosineSimilarity(query, JSON.parse(row.embedding)) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row: { name, position, content } }) => ({ name, position, content }));
}

export async function retrieve(question: string) {
  const rows = getDatabase().prepare(`
    SELECT d.name, c.position, c.content, c.embedding FROM chunks c
    JOIN documents d ON d.id = c.document_id ORDER BY d.id, c.position
  `).all() as StoredChunk[];
  if (!rows.length) return null;
  const [vector] = await embedTexts([question]);
  return rankChunks(vector, rows);
}
