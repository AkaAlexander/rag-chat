import Link from "next/link";
import { getDatabase } from "../../lib/db";
import { listDocuments } from "../../lib/rag/vector-store";
import Documents from "../../components/documents";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
      <Link href="/" className="text-teal-800 underline">Volver al chat</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Documentos</h1>
      <Documents initial={listDocuments(getDatabase())} />
    </main>
  );
}
