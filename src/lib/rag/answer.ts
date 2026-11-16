import { getProvider } from "../llm";
import type { ChatMessage } from "../schemas";
import { contextMessage, refusal, searchPrompt, systemPrompt } from "./prompts";
import { retrieve } from "./retrieve";

export async function* answerQuestion(messages: ChatMessage[], signal: AbortSignal, search = retrieve) {
  const question = messages[messages.length - 1].content;
  const previous = messages.at(-3)?.content;
  const query = previous && question.split(/\s+/).length <= 6
    ? question + "\n" + previous
    : question;
  const sources = await search(query);
  if (sources === null) {
    yield { error: "Todavía no hay documentos indexados. Abre «Gestionar documentos», elige un archivo y pulsa «Indexar documento»." };
    return;
  }
  const provider = getProvider();
  const maxAdditionalSearches = 1;
  for (let attempt = 0; attempt <= maxAdditionalSearches; attempt++) {
    signal.throwIfAborted();
    const context = contextMessage(messages, sources);
    if (sources.length) {
      const result = await provider.structured(context, systemPrompt, signal);
      const ids = [...new Set(result.citations)];
      const inline = [...result.answer.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
      if (result.answer.trim() && ids.length && ids.every(id => id >= 1 && id <= sources.length)
        && inline.every(id => ids.includes(id))) {
        yield { text: result.answer.trim() };
        yield { citations: ids.map(id => ({ id, ...sources[id - 1] })), confidence: result.confidence };
        return;
      }
    }
    if (attempt === maxAdditionalSearches) break;
    const query = await provider.requestSearch(context, searchPrompt, signal);
    if (!query) break;
    yield { status: "Buscando más información en tus documentos…" };
    const matches = await search(query);
    const added = (matches ?? []).filter(match => !sources.some(source =>
      source.name === match.name && source.position === match.position && source.content === match.content));
    if (!added.length) break;
    sources.push(...added);
  }
  yield { text: refusal(question) };
  yield { citations: [], confidence: "low" };
}
