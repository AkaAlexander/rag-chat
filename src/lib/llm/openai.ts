import OpenAI from "openai";
import { answerFormat, answerSchema, searchQuery, searchTool } from "./contracts";
import type { LLMProvider } from "./provider";

export function openaiProvider(model: string, apiKey: string): LLMProvider {
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  return {
    async structured(message, system, signal) {
      const result = await client.chat.completions.create({
        model, messages: [{ role: "system", content: system }, message],
        response_format: { type: "json_schema", json_schema: { name: "answer", strict: true, schema: answerFormat } },
      }, { signal });
      return answerSchema.parse(JSON.parse(result.choices[0]?.message.content ?? "null"));
    },
    async requestSearch(message, system, signal) {
      const result = await client.chat.completions.create({
        model, messages: [{ role: "system", content: system }, message],
        tools: [{ type: "function", function: searchTool }], parallel_tool_calls: false,
      }, { signal });
      const call = result.choices[0]?.message.tool_calls?.[0];
      return call?.type === "function" ? searchQuery(call.function.name, JSON.parse(call.function.arguments)) : null;
    },
    async *stream(messages, signal, systemPrompt) {
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
