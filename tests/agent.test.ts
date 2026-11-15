import { afterEach, expect, it, vi } from "vitest";
import { answerQuestion } from "../src/lib/rag/answer";
import { getProvider } from "../src/lib/llm";
import { retrieve } from "../src/lib/rag/retrieve";
import { answerSchema, searchQuery } from "../src/lib/llm/contracts";

vi.mock("../src/lib/rag/retrieve", () => ({ retrieve: vi.fn() }));
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const message = { role: "user" as const, content: "Which day?" };
const signal = new AbortController().signal;
const evidence = { position: 1, name: "schedule.md", content: "Monday" };

it.each(["ollama", "anthropic", "openai"])("parses a native %s search tool call", async provider => {
  vi.stubEnv("LLM_PROVIDER", provider);
  vi.stubEnv("ANTHROPIC_API_KEY", "test");
  vi.stubEnv("OPENAI_API_KEY", "test");
  const name = "search_documents", args = { query: "schedule" };
  const wire = {
    ollama: { message: { tool_calls: [{ function: { name, arguments: args } }] } },
    anthropic: { content: [{ type: "tool_use", name, input: args }] },
    openai: { choices: [{ message: { tool_calls: [{ type: "function", function: {
      name, arguments: JSON.stringify(args),
    } }] } }] },
  };
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(wire[provider as keyof typeof wire])));
  expect(await getProvider().requestSearch(message, "Search", signal)).toBe("schedule");
});

it.each([1, 9])("runs at most one tool search and verifies citation id %i", async id => {
  vi.stubEnv("LLM_PROVIDER", "ollama");
  vi.mocked(retrieve).mockResolvedValueOnce([]).mockResolvedValueOnce([evidence]);
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ message: { tool_calls: [
    { function: { name: "search_documents", arguments: { query: "schedule" } } },
  ] } })).mockResolvedValueOnce(Response.json({ message: { content: JSON.stringify({
    answer: "Monday", citations: [id], confidence: "high",
  }) } }));
  vi.stubGlobal("fetch", fetch);
  const events = [];
  for await (const event of answerQuestion([message], signal)) events.push(event);
  expect(vi.mocked(retrieve).mock.calls).toEqual([["Which day?"], ["schedule"]]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(events[0]).toHaveProperty("status");
  expect(events.at(-1)).toEqual(id === 1
    ? { citations: [{ id, ...evidence }], confidence: "high" }
    : { citations: [], confidence: "low" });
});

it("rejects malformed answers and unsafe tool arguments", () => {
  expect(answerSchema.safeParse({ answer: "Monday", citations: ["1"], confidence: "certain" }).success).toBe(false);
  expect(() => searchQuery("delete_documents", { query: "schedule" })).toThrow();
  expect(() => searchQuery("search_documents", { query: " " })).toThrow();
});
