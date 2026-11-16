"use client";

import { useState, type FormEvent } from "react";
import type { DocumentSummary } from "../lib/rag/vector-store";

export default function Documents({ initial }: { initial: DocumentSummary[] }) {
  const [documents, setDocuments] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function update(url: string, options: RequestInit, progress: string, success: string) {
    setBusy(true);
    setStatus(progress);
    try {
      const result = await fetch(url, options);
      if (!result.ok) throw new Error((await result.json()).error);
      const list = await fetch("/api/documents", { cache: "no-store" });
      if (!list.ok) throw new Error("Refresh the page to see the document list.");
      setDocuments(await list.json());
      setStatus(success);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The operation could not be completed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || !file.name) return;
    const ok = await update("/api/ingest", {
      method: "POST", body: file, headers: { "x-filename": encodeURIComponent(file.name) },
    }, "Indexing document…", "Document indexed.");
    if (ok) form.reset();
  }

  return (
    <>
      <form onSubmit={upload} className="grid gap-3 rounded-xl border border-stone-300 bg-white p-5">
        <label htmlFor="file" className="font-semibold">Upload a document</label>
        <p id="formats" className="text-sm text-stone-600">Markdown or UTF-8 text · Up to 256 KiB per file</p>
        <input id="file" name="file" type="file" accept=".md,.txt" required disabled={busy}
          aria-describedby="formats" className="file:mr-3 file:rounded file:bg-stone-100 file:px-3 file:py-2" />
        <button disabled={busy} className="justify-self-start rounded-lg bg-teal-900 px-5 py-2 text-white disabled:opacity-50">
          Index document
        </button>
      </form>
      <p role="status">{status}</p>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Indexed documents</h2>
        {!documents.length && <p>No documents yet.</p>}
        <ul className="divide-y divide-stone-300">
          {documents.map(doc => (
            <li key={doc.id} className="flex items-center justify-between gap-4 py-3">
              <div><strong className="break-all">{doc.name}</strong>
                <p className="text-sm text-stone-600">{doc.chunks} {doc.chunks === 1 ? "chunk" : "chunks"}</p></div>
              <button disabled={busy} aria-label={`Delete ${doc.name}`} className="text-red-800 underline"
                onClick={() => update("/api/documents?id=" + doc.id, { method: "DELETE" }, "Deleting…", "Document deleted.")}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
