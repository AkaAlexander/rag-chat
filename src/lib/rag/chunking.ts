export function chunkText(text: string, size = 80, overlap = 16): string[] {
  if (!Number.isInteger(size) || !Number.isInteger(overlap) || overlap < 0 || size <= overlap) {
    throw new Error("Chunk size must exceed a non-negative overlap");
  }
  // Split unusually long tokens too, so a single URL cannot dominate an input.
  const units = [...text.matchAll(/\S{1,64}/gu)];
  const chunks: string[] = [];
  for (let start = 0; start < units.length; start += size - overlap) {
    const last = units[Math.min(start + size, units.length) - 1];
    chunks.push(text.slice(units[start].index, last.index + last[0].length));
    if (start + size >= units.length) break;
  }
  return chunks;
}
