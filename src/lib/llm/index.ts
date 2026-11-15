import { readConfig } from "../config";
import { anthropicProvider } from "./anthropic";
import { ollamaProvider } from "./ollama";
import { openaiProvider } from "./openai";
import type { LLMProvider } from "./provider";

export function getProvider(): LLMProvider {
  const config = readConfig();
  switch (config.LLM_PROVIDER) {
    case "anthropic": return anthropicProvider(config.ANTHROPIC_MODEL, config.ANTHROPIC_API_KEY!);
    case "openai": return openaiProvider(config.OPENAI_MODEL, config.OPENAI_API_KEY!);
    case "ollama": return ollamaProvider(config.OLLAMA_MODEL, config.OLLAMA_BASE_URL);
  }
}
