import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/chat/route";
import { allowRequest } from "../src/lib/rate-limit";
import { retrieve } from "../src/lib/rag/retrieve";

vi.mock("../src/lib/rag/retrieve", () => ({
  retrieve: vi.fn(async () => [{ name: "guia.md", content: "Sí, claro.", position: 0 }]),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function request(content = "Hola") {
  return new Request("http://localhost/api/chat", {
    method: "POST", body: JSON.stringify({ messages: [{ role: "user", content }] }),
  });
}

it("rejects oversized questions before contacting the provider", async () => {
  expect((await POST(request("x".repeat(4001)))).status).toBe(400);
});

it("limits requests per address until the window expires", () => {
  for (let count = 0; count < 10; count++) expect(allowRequest("first", 1000)).toBe(true);
  expect(allowRequest("first", 1001)).toBe(false);
  expect(allowRequest("second", 1001)).toBe(true);
  expect(allowRequest("first", 61000)).toBe(true);
});

it.each(["ollama", "openai", "anthropic"])("validates the structured %s response through the route", async provider => {
  vi.stubEnv("LLM_PROVIDER", provider);
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  const content = JSON.stringify({ answer: "Sí, claro.", citations: [1], confidence: "high" });
  const wire = {
    ollama: { message: { content } },
    openai: { choices: [{ message: { content } }] },
    anthropic: { content: [{ type: "text", text: content }] },
  };
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(wire[provider as keyof typeof wire])));
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.text()).trim().split("\n").map(line => JSON.parse(line)))
    .toEqual([{ text: "Sí, claro." }, { citations: [
      { id: 1, name: "guia.md", position: 0, content: "Sí, claro." },
    ], confidence: "high" }, { done: true }]);
});

it("declines when retrieval finds no evidence and no search is requested", async () => {
  vi.mocked(retrieve).mockResolvedValueOnce([]);
  vi.stubEnv("LLM_PROVIDER", "ollama");
  const fetch = vi.fn(async () => Response.json({ message: { content: "" } }));
  vi.stubGlobal("fetch", fetch);
  expect(await (await POST(request("¿Qué precio tiene?"))).text()).toContain("No encuentro");
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("explains how to index the first document when the library is empty", async () => {
  vi.mocked(retrieve).mockResolvedValueOnce(null);
  const response = await POST(request());
  expect(await response.text()).toContain("No documents have been indexed yet");
});

it("signals interrupted responses without exposing upstream details", async () => {
  vi.stubEnv("LLM_PROVIDER", "ollama");
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"private detail"}')));
  expect(await (await POST(request())).text()).toBe('{"error":true}\n');
});

it("reports exhausted API credit separately from temporary throttling", async () => {
  vi.stubEnv("LLM_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    error: { code: "credit_balance_exhausted", type: "insufficient_quota", message: "private detail" },
  }, { status: 429 })));
  const event = JSON.parse(await (await POST(request())).text());
  expect(event.error).toBe("API credits are exhausted. Check your account billing.");
});
