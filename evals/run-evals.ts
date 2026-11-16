import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { openDatabase } from "../src/lib/db";
import { readConfig } from "../src/lib/config";
import { answerQuestion } from "../src/lib/rag/answer";
import { chunkText } from "../src/lib/rag/chunking";
import { embedTexts } from "../src/lib/rag/embeddings";
import { retrieve, type Source } from "../src/lib/rag/retrieve";
import { saveDocument } from "../src/lib/rag/vector-store";
import dataset from "./dataset.json";
import { score } from "./score";

async function run() {
  const config = readConfig();
  const models = { ollama: config.OLLAMA_MODEL, anthropic: config.ANTHROPIC_MODEL, openai: config.OPENAI_MODEL };
  console.log(`Provider: ${config.LLM_PROVIDER} | Model: ${models[config.LLM_PROVIDER]}`);
  const db = openDatabase(":memory:");
  try {
    const dir = "data/sample-docs";
    for (const name of readdirSync(dir).filter(name => /\.(md|txt)$/i.test(name)).sort()) {
      const content = readFileSync(path.join(dir, name), "utf8");
      const chunks = chunkText(content);
      const digest = createHash("sha256").update(content).digest("hex");
      saveDocument(db, name, content, digest, chunks, await embedTexts(chunks));
    }
    const results = [];
    for (const [index, item] of dataset.entries()) {
      let answer = "";
      let sources: Source[] = [];
      let error = false;
      try {
        const events = answerQuestion([{ role: "user", content: item.question }],
          AbortSignal.timeout(180_000), question => retrieve(question, db));
        for await (const event of events) {
          if (event.error) throw new Error("Chat failed");
          if (event.text) answer += event.text;
          if (event.citations) sources = event.citations;
        }
      } catch (cause) {
        error = true;
        console.error(`Case ${index + 1} failed (${cause instanceof Error ? cause.name : "unknown error"})`);
        process.exitCode = 1;
      }
      const marks = score(item, error ? "" : answer, error ? [] : sources);
      results.push(marks);
      console.log(`${index + 1}. ${item.question} | ${error ? "ERROR" : answer} | ${sources.map(s => s.name).join(", ")} | ${JSON.stringify(marks)}`);
    }
    const metrics = [
      ["Correct answers", results.map(r => r.correct)],
      ["Correct citations", results.map(r => r.citation)],
      ["Correct abstentions", results.map(r => r.rejected)],
    ] as const;
    console.log("\n| Metric | Passed | Percentage |\n|---|---:|---:|");
    for (const [name, values] of metrics) {
      const applicable = values.filter(v => v !== null);
      const passed = applicable.filter(Boolean).length;
      const percentage = applicable.length ? (100 * passed / applicable.length).toFixed(1) + " %" : "—";
      console.log(`| ${name} | ${passed}/${applicable.length} | ${percentage} |`);
    }
  } finally {
    db.close();
  }
}

run().catch(() => {
  console.error("Evaluation could not start. Check the configuration, sample documents and model cache.");
  process.exitCode = 1;
});
