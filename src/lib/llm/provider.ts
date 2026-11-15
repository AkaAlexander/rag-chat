import type { ChatMessage } from "../schemas";

export interface LLMProvider {
  stream(messages: ChatMessage[], signal: AbortSignal, systemPrompt: string): AsyncIterable<string>;
}
