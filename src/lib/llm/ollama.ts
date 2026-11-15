import { z } from "zod";
import { systemPrompt, type LLMProvider } from "./provider";

const chunkSchema = z.object({
  done: z.boolean(),
  message: z.object({ content: z.string() }),
});

export function ollamaProvider(model: string, baseUrl: string): LLMProvider {
  return {
    async *stream(messages, signal) {
      const response = await fetch(new URL("api/chat", baseUrl.replace(/\/?$/, "/")), {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model, stream: true, options: { num_predict: 2048 },
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
