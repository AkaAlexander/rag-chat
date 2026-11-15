import { z } from "zod";

export const questionLimit = 4000;
export const historyLimit = 21;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1),
});

export type ChatMessage = z.infer<typeof messageSchema>;

export const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(historyLimit),
}).refine(({ messages }) => messages.length % 2 === 1 && messages.every((message, index) =>
  index % 2 === 0
    ? message.role === "user" && message.content.length <= questionLimit
    : message.role === "assistant" && message.content.length <= 32000
));
