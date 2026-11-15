import OpenAI from "openai";
import { systemPrompt, type LLMProvider } from "./provider";

export function openaiProvider(model: string, apiKey: string): LLMProvider {
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  return {
    async *stream(messages, signal) {
      const events = await client.chat.completions.create({
        model, stream: true, max_completion_tokens: 2048,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }, { signal });
      for await (const event of events) {
        const text = event.choices[0]?.delta.content;
        if (text) yield text;
      }
    },
  };
}
