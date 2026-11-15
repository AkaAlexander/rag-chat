import { z } from "zod";

const model = z.string().trim().min(1);
const configSchema = z.object({
  LLM_PROVIDER: z.enum(["ollama", "anthropic", "openai"]).default("ollama"),
  OLLAMA_BASE_URL: z.url({ protocol: /^https?$/ }).default("http://localhost:11434"),
  OLLAMA_MODEL: model.default("qwen3:4b"),
  ANTHROPIC_MODEL: model.default("claude-sonnet-5-5"),
  OPENAI_MODEL: model.default("gpt-4.1-mini"),
  ANTHROPIC_API_KEY: z.string().trim().optional(),
  OPENAI_API_KEY: z.string().trim().optional(),
}).superRefine((config, ctx) => {
  if (config.LLM_PROVIDER === "ollama") return;
  const key = config.LLM_PROVIDER === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  if (!config[key]) {
    ctx.addIssue({ code: "custom", path: [key], message: "Required for the selected provider" });
  }
});

export function readConfig(env: Record<string, string | undefined> = process.env) {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues.map(issue => issue.path.join("."));
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}`);
  }
  return result.data;
}
