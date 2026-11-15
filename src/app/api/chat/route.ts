import { getProvider } from "../../../lib/llm";
import { readConfig } from "../../../lib/config";
import { allowRequest } from "../../../lib/rate-limit";
import { chatSchema } from "../../../lib/schemas";

export async function POST(request: Request) {
  const ip = readConfig().TRUST_PROXY === "true"
    ? request.headers.get("x-real-ip") ?? "local"
    : "local";
  if (!allowRequest(ip)) {
    return Response.json({ error: "Demasiadas preguntas. Inténtalo en un minuto." }, { status: 429 });
  }
  const input = chatSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "Revisa la longitud de la pregunta y el historial." }, { status: 400 });
  }

  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(180_000)]);
  const encoder = new TextEncoder();
  const events = getProvider().stream(input.data.messages, signal)[Symbol.asyncIterator]();
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const next = await events.next();
        const event = next.done ? { done: true } : { text: next.value };
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
      await events.return?.();
    },
  });
  return new Response(body, { headers: {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store", "X-Accel-Buffering": "no",
  } });
}

function rateLimitMessage(cause: Error) {
  if ("code" in cause && cause.code === "credit_balance_exhausted") {
    return "Se ha agotado el saldo de la API. Revisa la facturación de tu cuenta.";
  }
  if ("type" in cause && cause.type === "insufficient_quota") {
    return "La cuota de la API es insuficiente. Revisa el saldo y los límites de uso.";
  }
  return "El proveedor ha limitado las peticiones. Espera un momento y vuelve a intentarlo.";
}
