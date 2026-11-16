import path from "node:path";

const maxBytes = 256 * 1024;
export class UploadError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function readUpload(request: Request) {
  let filename: string;
  try {
    filename = decodeURIComponent(request.headers.get("x-filename") ?? "");
  } catch {
    throw new UploadError("Invalid file name.");
  }
  const base = path.win32.basename(filename.normalize("NFC"));
  const match = /^(.+)\.(md|txt)$/iu.exec(base);
  if (!match) throw new UploadError("Choose an .md or .txt file.", 415);
  const stem = match[1].replace(/[^\p{L}\p{N} _.-]/gu, "_").slice(0, 100);
  const name = stem + "." + match[2].toLowerCase();
  const mime = request.headers.get("content-type")?.split(";")[0].toLowerCase();
  if (mime && !["text/plain", "text/markdown", "text/x-markdown", "application/octet-stream"].includes(mime)) {
    throw new UploadError("Unsupported file type.", 415);
  }
  const tooLarge = () => new UploadError("The maximum file size is 256 KiB.", 413);
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  if (!request.body) throw new UploadError("The file is empty.");
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    parts.push(value);
  }
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts));
  } catch {
    throw new UploadError("Save the document as UTF-8 text.");
  }
  if (!content.trim() || Array.from(content).some(char => char < " " && !"\r\n\t".includes(char))) {
    throw new UploadError("The file must contain readable text.");
  }
  return { name, content };
}
