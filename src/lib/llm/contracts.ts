import { z } from "zod";

export const answerSchema = z.strictObject({
  answer: z.string(),
  citations: z.array(z.number().int()),
  confidence: z.enum(["low", "medium", "high"]),
});

export type ModelAnswer = z.infer<typeof answerSchema>;
export const answerFormat = z.toJSONSchema(answerSchema, { target: "draft-7" });
const searchInput = z.strictObject({ query: z.string() });

export const searchTool = {
  name: "search_documents",
  description: "Search the indexed documents with a concise reformulation of the unanswered question.",
  parameters: z.toJSONSchema(searchInput, { target: "draft-7" }),
};

export function searchQuery(name: string, args: unknown) {
  if (name !== searchTool.name) throw new Error("Unknown tool");
  return z.string().trim().min(1).max(512).parse(searchInput.parse(args).query);
}
