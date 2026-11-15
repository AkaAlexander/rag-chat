import { pipeline } from "@huggingface/transformers";
import path from "node:path";

const loadModel = () => pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
  dtype: "q8", device: "cpu", cache_dir: path.resolve("data/model-cache"),
  // Transformers.js v3 streams cached files when a progress callback is present.
  // This respects byte offsets for small JSON files in Node's shared buffer pool.
  progress_callback: () => {},
});

let loading: ReturnType<typeof loadModel> | undefined;

export async function embedTexts(texts: string[]) {
  loading ??= loadModel().catch(error => {
    loading = undefined;
    throw error;
  });
  const model = await loading;
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += 8) {
    const output = await model(texts.slice(i, i + 8), { pooling: "mean", normalize: true });
    vectors.push(...output.tolist() as number[][]);
  }
  return vectors;
}
