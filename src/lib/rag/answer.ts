import { getProvider } from "../llm";
import type { ChatMessage } from "../schemas";
import { citedSources, contextMessage, refusal, systemPrompt } from "./prompts";
import { retrieve } from "./retrieve";

export async function* answerQuestion(messages: ChatMessage[], signal: AbortSignal) {
  const question = messages[messages.length - 1].content;
  const previous = messages.at(-3)?.content;
  const query = previous && question.split(/\s+/).length <= 6
    ? question + "\n" + previous
    : question;
  const sources = await retrieve(query);
  if (sources.length) {
    let answer = "";
    for await (const text of getProvider().stream([contextMessage(messages, sources)], signal, systemPrompt)) {
      answer += text;
    }
    const citations = citedSources(answer, sources);
    if (citations.length) {
      yield { text: answer.trim() };
      yield { citations };
      return;
    }
  }
  yield { text: refusal(question) };
}
