import { answerQuestion } from "../../../lib/rag/answer";
import { readConfig } from "../../../lib/config";
import { allowRequest } from "../../../lib/rate-limit";
import { chatSchema } from "../../../lib/schemas";

export async function POST(request: Request) {
  const ip = readConfig().TRUST_PROXY === "true"
    ? request.headers.get("x-real-ip") ?? "local"
    : "local";
  if (!allowRequest(ip)) {
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  const input = chatSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "Check the question length and conversation history." }, { status: 400 });
  }

  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(180_000)]);
  const encoder = new TextEncoder();
  const events = answerQuestion(input.data.messages, signal);
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const next = await events.next();
        const event = next.done ? { done: true } : next.value;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        if (next.done) controller.close();
      } catch (cause) {
        const error = cause instanceof Error && "status" in cause && cause.status === 429
          ? rateLimitMessage(cause)
          : true;
        controller.enqueue(encoder.encode(JSON.stringify({ error }) + "\n"));
        controller.close();
      }
    },
    async cancel() {
      abort.abort();
      await events.return(undefined);
    },
  });
  return new Response(body, { headers: {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store", "X-Accel-Buffering": "no",
  } });
}

function rateLimitMessage(cause: Error) {
  if ("code" in cause && cause.code === "credit_balance_exhausted") {
    return "API credits are exhausted. Check your account billing.";
  }
  if ("type" in cause && cause.type === "insufficient_quota") {
    return "Insufficient API quota. Check your balance and usage limits.";
  }
  return "The provider has limited requests. Wait a moment and try again.";
}
