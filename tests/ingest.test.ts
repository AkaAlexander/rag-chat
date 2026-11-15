import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/lib/db";
import { chunkText } from "../src/lib/rag/chunking";
import { listDocuments, saveDocument } from "../src/lib/rag/vector-store";
import { readUpload } from "../src/lib/rag/upload";

describe("chunkText", () => {
  it("keeps overlap without emitting a redundant tail", () => {
    expect(chunkText("uno dos tres cuatro cinco", 3, 1)).toEqual(["uno dos tres", "tres cuatro cinco"]);
    expect(chunkText("een two trois vier", 3, 1)).toEqual(["een two trois", "trois vier"]);
  });
  it("handles whitespace and rejects a non-advancing window", () => {
    expect(chunkText(" \r\n ")).toEqual([]);
    expect(() => chunkText("a", 2, 2)).toThrow();
  });
});

it("persists vectors once and cascades deletions", () => {
  const db = openDatabase(":memory:");
  try {
    const save = () => saveDocument(db, "guide.md", "hello", "abc", ["hello"], [Array(384).fill(0.1)]);
    expect(save()).toBe(true);
    expect(save()).toBe(false);
    expect(listDocuments(db)).toEqual([{ id: 1, name: "guide.md", chunks: 1 }]);
    db.prepare("DELETE FROM documents WHERE id = 1").run();
    expect(db.prepare("SELECT * FROM chunks").all()).toEqual([]);
  } finally {
    db.close();
  }
});

it("validates upload content, size and extension and strips path components", async () => {
  const read = (file: string, body: string) => readUpload(new Request("http://localhost", {
    method: "POST", body, headers: { "x-filename": encodeURIComponent(file) },
  }));
  await expect(read("../guía.md", "texto")).resolves.toEqual({ name: "guía.md", content: "texto" });
  await expect(read("file.pdf", "pdf")).rejects.toMatchObject({ status: 415 });
  await expect(read("file.md", "a\0b")).rejects.toMatchObject({ status: 400 });
  await expect(read("file.md", "a".repeat(262145))).rejects.toMatchObject({ status: 413 });
});
