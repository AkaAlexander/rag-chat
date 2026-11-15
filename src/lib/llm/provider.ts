import type { ChatMessage } from "../schemas";
import type { ModelAnswer } from "./contracts";

export interface LLMProvider {
  structured(message: ChatMessage, system: string, signal: AbortSignal): Promise<ModelAnswer>;
  requestSearch(message: ChatMessage, system: string, signal: AbortSignal): Promise<string | null>;
  stream(messages: ChatMessage[], signal: AbortSignal, systemPrompt: string): AsyncIterable<string>;
}
