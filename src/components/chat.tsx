"use client";

import { useState, type FormEvent } from "react";
import { historyLimit, questionLimit, type ChatMessage } from "../lib/schemas";

const providerError = "El proveedor no completó la respuesta. Comprueba el servicio y el modelo configurados.";

async function readAnswer(response: Response, update: (text: string) => void) {
  if (!response.ok) throw new Error((await response.json()).error);
  if (!response.body) throw new Error(providerError);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let answer = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error(providerError);
      buffer += chunk.value;
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.error) throw new Error(typeof event.error === "string" ? event.error : providerError);
        if (event.done && answer.trim()) return answer;
        if (typeof event.text !== "string") throw new Error(providerError);
        answer += event.text;
        update(answer);
      }
    }
  } finally {
    await reader.cancel();
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState("");
  const [partial, setPartial] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !question.trim()) return;
    const message: ChatMessage = { role: "user", content: question.trim() };
    const history = [...messages, message];
    setPending(message.content);
    setQuestion("");
    setPartial("");
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-historyLimit) }),
      });
      const content = await readAnswer(response, setPartial);
      setMessages([...history, { role: "assistant", content }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : providerError);
      setQuestion(message.content);
    } finally {
      setPending("");
      setPartial("");
    }
  }

  const visible = pending ? [...messages, { role: "user", content: pending },
    { role: "assistant", content: partial || "Generando respuesta…" }] : messages;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-5 py-10">
      <header className="border-b border-stone-300 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">RAG Chat</h1>
        <p className="mt-2 text-sm text-stone-600">Chat general · Documentos aún sin conectar</p>
      </header>
      <section aria-label="Conversación" className="flex flex-1 flex-col gap-4">
        {visible.map((message, index) => (
          <article key={index} className={message.role === "user"
            ? "ml-auto max-w-[85%] rounded-xl bg-teal-900 px-4 py-3 text-white"
            : "rounded-xl border border-stone-200 bg-white px-4 py-3"}>
            <h2 className="mb-1 text-xs font-semibold">{message.role === "user" ? "Tú" : "Asistente"}</h2>
            <p className="whitespace-pre-wrap wrap-anywhere">{message.content}</p>
          </article>
        ))}
      </section>
      <form onSubmit={submit} className="grid gap-3">
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <label htmlFor="question" className="font-medium">Tu pregunta</label>
        <textarea id="question" rows={3} value={question} maxLength={questionLimit}
          disabled={Boolean(pending)} onChange={event => setQuestion(event.target.value)}
          className="rounded-xl border border-stone-400 bg-white p-3" />
        <button disabled={Boolean(pending) || !question.trim()}
          className="justify-self-end rounded-lg bg-teal-900 px-6 py-2 font-medium text-white disabled:opacity-50">
          Enviar
        </button>
      </form>
    </main>
  );
}
