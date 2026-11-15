import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./provider";

export function anthropicProvider(model: string, apiKey: string): LLMProvider {
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  return {
    async *stream(messages, signal, systemPrompt) {
      const events = await client.messages.create({
        model, system: systemPrompt, messages, stream: true, max_tokens: 2048,
      }, { signal });
      for await (const event of events) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
    },
  };
}
