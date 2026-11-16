"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { historyLimit, questionLimit, type ChatMessage } from "../lib/schemas";

const providerError = "The provider could not complete the response. Check the configured service and model.";

interface Citation { id: number; name: string; position: number; content: string }
const confidenceLabels = { low: "low", medium: "medium", high: "high" };
type Confidence = keyof typeof confidenceLabels;
type VisibleMessage = ChatMessage & { citations?: Citation[]; confidence?: Confidence };

async function readAnswer(response: Response, update: (text: string) => void) {
  if (!response.ok) throw new Error((await response.json()).error);
  if (!response.body) throw new Error(providerError);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let answer = "";
  let citations: Citation[] = [];
  let confidence: Confidence | undefined;
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
        if (event.status) {
          update(event.status);
          continue;
        }
        if (event.done && answer.trim()) return { content: answer, citations, confidence };
        if (Array.isArray(event.citations)) {
          citations = event.citations;
          confidence = event.confidence;
          continue;
        }
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
  const [messages, setMessages] = useState<VisibleMessage[]>([]);
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
        body: JSON.stringify({ messages: history.slice(-historyLimit).map(({ role, content }) => ({ role, content })) }),
      });
      const answer = await readAnswer(response, setPartial);
      setMessages([...history, { role: "assistant", ...answer }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : providerError);
      setQuestion(message.content);
    } finally {
      setPending("");
      setPartial("");
    }
  }

  const visible: VisibleMessage[] = pending ? [...messages, { role: "user", content: pending },
    { role: "assistant", content: partial || "Generating an answer…" }] : messages;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-5 py-10">
      <header className="border-b border-stone-300 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">RAG Chat</h1>
        <Link href="/documents" className="text-teal-800 underline">Manage documents</Link>
        <p className="mt-2 text-sm text-stone-600">Ask a question about your indexed documents.</p>
      </header>
      <section aria-label="Conversation" className="flex flex-1 flex-col gap-4">
        {visible.map((message, index) => (
          <article key={index} className={message.role === "user"
            ? "ml-auto max-w-[85%] rounded-xl bg-teal-900 px-4 py-3 text-white"
            : "rounded-xl border border-stone-200 bg-white px-4 py-3"}>
            <h2 className="mb-1 text-xs font-semibold">{message.role === "user" ? "You" : "Assistant"}</h2>
            <p className="whitespace-pre-wrap wrap-anywhere">{message.content}</p>
            {message.confidence && <p className="mt-2 text-xs text-stone-600">
              Estimated confidence · {confidenceLabels[message.confidence]}
            </p>}
            {message.citations?.map(source => (
              <details key={source.id} className="mt-3 border-t border-stone-200 pt-2 text-sm">
                <summary className="cursor-pointer font-medium">[{source.id}] {source.name} · Chunk {source.position + 1}</summary>
                <blockquote className="mt-2 whitespace-pre-wrap wrap-anywhere text-stone-700">{source.content}</blockquote>
              </details>
            ))}
          </article>
        ))}
      </section>
      <form onSubmit={submit} className="grid gap-3">
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <label htmlFor="question" className="font-medium">Your question</label>
        <textarea id="question" rows={3} value={question} maxLength={questionLimit}
          disabled={Boolean(pending)} onChange={event => setQuestion(event.target.value)}
          className="rounded-xl border border-stone-400 bg-white p-3" />
        <button disabled={Boolean(pending) || !question.trim()}
          className="justify-self-end rounded-lg bg-teal-900 px-6 py-2 font-medium text-white disabled:opacity-50">
          Send
        </button>
      </form>
    </main>
  );
}
