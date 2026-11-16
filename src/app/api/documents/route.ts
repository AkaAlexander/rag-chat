import { z } from "zod";
import { getDatabase } from "../../../lib/db";
import { listDocuments } from "../../../lib/rag/vector-store";

export async function GET() {
  return Response.json(listDocuments(getDatabase()), { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const id = z.coerce.number().int().positive().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return Response.json({ error: "Invalid document ID." }, { status: 400 });
  const result = getDatabase().prepare("DELETE FROM documents WHERE id = ?").run(id.data);
  if (!result.changes) return Response.json({ error: "This document no longer exists." }, { status: 404 });
  return new Response(null, { status: 204 });
}
