import { createHash } from "node:crypto";
import { getDatabase } from "../../../lib/db";
import { chunkText } from "../../../lib/rag/chunking";
import { embedTexts } from "../../../lib/rag/embeddings";
import { readUpload, UploadError } from "../../../lib/rag/upload";
import { saveDocument } from "../../../lib/rag/vector-store";

export async function POST(request: Request) {
  const duplicate = () => Response.json({ error: "Este contenido ya está indexado." }, { status: 409 });
  try {
    const { name, content } = await readUpload(request);
    const digest = createHash("sha256").update(content).digest("hex");
    const db = getDatabase();
    if (db.prepare("SELECT id FROM documents WHERE digest = ?").get(digest)) return duplicate();
    const chunks = chunkText(content);
    const vectors = await embedTexts(chunks);
    if (!saveDocument(db, name, content, digest, chunks, vectors)) return duplicate();
    return Response.json({ name, chunks: chunks.length }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "No se pudo indexar el archivo. Comprueba la descarga del modelo y el acceso al disco." }, { status: 503 });
  }
}
