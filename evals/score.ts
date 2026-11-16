import type { Source } from "../src/lib/rag/retrieve";

export interface EvalCase {
  question: string;
  expectedRefusal?: string;
  expected: { answers: string[]; document: string; evidence: string } | null;
}

function normalized(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}€]+/gu, " ").trim();
}

export function score(item: EvalCase, answer: string, sources: Source[]) {
  const expected = item.expected;
  if (!expected) {
    const rejected = answer === item.expectedRefusal && sources.length === 0;
    return { correct: rejected, citation: null, rejected };
  }
  const text = " " + normalized(answer) + " ";
  const correct = expected.answers.some(alias => text.includes(" " + normalized(alias) + " "));
  const citation = sources.length > 0 && sources.every(source =>
    source.name === expected.document && source.content.includes(expected.evidence));
  return { correct, citation, rejected: null };
}
