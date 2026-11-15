import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/chat/route";
import { allowRequest } from "../src/lib/rate-limit";

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

it.each(["ollama", "openai", "anthropic"])("streams %s through the route", async provider => {
  vi.stubEnv("LLM_PROVIDER", provider);
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  const pieces = ["Sí", ", claro."];
  const sse = (data: unknown) => "data: " + JSON.stringify(data) + "\n\n";
  const wire = {
    ollama: pieces.map((content, i) => JSON.stringify({ done: i === 1, message: { content } })).join("\n"),
    openai: pieces.map(content => sse({ choices: [{ delta: { content } }] })).join("") + "data: [DONE]\n\n",
    anthropic: pieces.map(text => "event: content_block_delta\n" +
      sse({ type: "content_block_delta", delta: { type: "text_delta", text } })).join(""),
  };
  const key = provider as keyof typeof wire;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(wire[key], {
    headers: { "content-type": provider === "ollama" ? "application/x-ndjson" : "text/event-stream" },
  })));
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.text()).trim().split("\n").map(line => JSON.parse(line)))
    .toEqual([{ text: "Sí" }, { text: ", claro." }, { done: true }]);
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
  expect(event.error).toBe("Se ha agotado el saldo de la API. Revisa la facturación de tu cuenta.");
});
