import Anthropic from "@anthropic-ai/sdk";
import { answerFormat, answerSchema, searchQuery, searchTool } from "./contracts";
import type { LLMProvider } from "./provider";

export function anthropicProvider(model: string, apiKey: string): LLMProvider {
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  return {
    async structured(message, system, signal) {
      const result = await client.messages.create({
        model, system, messages: [message], max_tokens: 2048,
        output_config: { format: { type: "json_schema", schema: answerFormat } },
      }, { signal });
      const text = result.content.find(block => block.type === "text");
      return answerSchema.parse(JSON.parse(text?.text ?? "null"));
    },
    async requestSearch(message, system, signal) {
      const result = await client.messages.create({
        model, system, messages: [message], max_tokens: 512,
        tools: [{ name: searchTool.name, description: searchTool.description,
          input_schema: { ...searchTool.parameters, type: "object" } }],
      }, { signal });
      const call = result.content.find(block => block.type === "tool_use");
      return call ? searchQuery(call.name, call.input) : null;
    },
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
