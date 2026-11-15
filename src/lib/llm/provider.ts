import type { ChatMessage } from "../schemas";

export interface LLMProvider {
  stream(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<string>;
}

export const systemPrompt = "Reply in the language of the user's question. You have no access to documents in this chat.";
