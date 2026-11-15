import { describe, expect, it } from "vitest";
import { readConfig } from "../src/lib/config";

describe("readConfig", () => {
  it("defaults to local Ollama without credentials", () => {
    expect(readConfig({}).LLM_PROVIDER).toBe("ollama");
  });

  it.each([["openai", "OPENAI_API_KEY"], ["anthropic", "ANTHROPIC_API_KEY"]])(
    "requires only the selected %s key",
    (provider, key) => {
      expect(() => readConfig({ LLM_PROVIDER: provider, [key]: " " })).toThrow(key);
      expect(readConfig({ LLM_PROVIDER: provider, [key]: "test-only" }).LLM_PROVIDER).toBe(provider);
    }
  );

  it("rejects unknown providers and invalid server URLs", () => {
    expect(() => readConfig({ LLM_PROVIDER: "unknown" })).toThrow("LLM_PROVIDER");
    expect(() => readConfig({ OLLAMA_BASE_URL: "file:///tmp" })).toThrow("OLLAMA_BASE_URL");
  });
});
