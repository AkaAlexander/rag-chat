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

function words(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function rankChunks(query: number[], rows: StoredChunk[], threshold = 0.35, limit = 4, question = ""): Source[] {
  const terms = [...new Set(words(question).filter(term => term.length >= 3))];
  const candidates = rows.map(row => ({
    row, score: cosineSimilarity(query, JSON.parse(row.embedding)), tokens: new Set(words(row.content)),
  }));
  // Rare terms distinguish a specific event from the broader topic of a question.
  const weights = terms.map(term => {
    const frequency = candidates.filter(candidate => candidate.tokens.has(term)).length;
    return frequency ? Math.log(1 + rows.length / frequency) : 0;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return candidates
    .filter(({ score }) => score >= threshold)
    .map(({ row, score, tokens }) => {
      const matched = terms.reduce((sum, term, i) => sum + (tokens.has(term) ? weights[i] : 0), 0);
      return { row, score: score + (total ? 0.5 * matched / total : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row: { name, position, content } }) => ({ name, position, content }));
}

export async function retrieve(question: string, db = getDatabase()) {
  const rows = db.prepare(`
    SELECT d.name, c.position, c.content, c.embedding FROM chunks c
    JOIN documents d ON d.id = c.document_id ORDER BY d.id, c.position
  `).all() as StoredChunk[];
  if (!rows.length) return null;
  const [vector] = await embedTexts([question]);
  return rankChunks(vector, rows, 0.35, 4, question);
}
