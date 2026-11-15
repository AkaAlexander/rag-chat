import { z } from "zod";
import { answerFormat, answerSchema, searchQuery, searchTool } from "./contracts";
import type { ChatMessage } from "../schemas";
import { finalAnswer } from "../rag/prompts";
import type { LLMProvider } from "./provider";

const chunkSchema = z.object({
  done: z.boolean(),
  message: z.object({ content: z.string() }),
});

export function ollamaProvider(model: string, baseUrl: string): LLMProvider {
  const url = new URL("api/chat", baseUrl.replace(/\/?$/, "/"));
  async function complete(message: ChatMessage, system: string, signal: AbortSignal, options: object) {
    const response = await fetch(url, {
      method: "POST", signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false,
        ...(model.split(":")[0] === "qwen3" ? { think: false } : {}),
        options: { temperature: 0, num_predict: 3072 }, ...options,
        messages: [{ role: "system", content: system }, message] }),
    });
    if (!response.ok) throw new Error("Ollama unavailable");
    return (await response.json()).message;
  }
  return {
    async structured(message, system, signal) {
      const reply = await complete(message, system, signal, {
        format: answerFormat, ...(model.split(":")[0] === "qwen3" ? { think: true } : {}),
      });
      return answerSchema.parse(JSON.parse(finalAnswer(reply.content)));
    },
    async requestSearch(message, system, signal) {
      const reply = await complete(message, system, signal, { tools: [{ type: "function", function: searchTool }] });
      const call = reply.tool_calls?.[0]?.function;
      return call ? searchQuery(call.name, call.arguments) : null;
    },
    async *stream(messages, signal, systemPrompt) {
      const response = await fetch(url, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model, stream: true,
          ...(model.split(":")[0] === "qwen3" ? { think: false } : {}),
          options: { num_predict: 2048, temperature: 0 },
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      });
      if (!response.ok || !response.body) throw new Error("Ollama unavailable");

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += value ?? "";
          const lines = buffer.split("\n");
          buffer = done ? "" : lines.pop()!;
          for (const line of lines) {
            if (!line.trim()) continue;
            const chunk = chunkSchema.parse(JSON.parse(line));
            if (chunk.message.content) yield chunk.message.content;
            if (chunk.done) return;
          }
          if (done) throw new Error("Incomplete Ollama response");
        }
      } finally {
        await reader.cancel();
      }
    },
  };
}
