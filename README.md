# RAG Chat

Ask questions about your own documents and open a numbered citation to read the passage behind each answer. The app indexes Markdown and plain text locally and supports questions and documents in English, Spanish and Dutch.

## Run locally on Windows

Use Node.js 24 and npm. For the default configuration, start Ollama and download the chat model from PowerShell:

```powershell
node --version
npm.cmd --version
ollama --version
ollama pull qwen3:4b
```

Open PowerShell in the directory containing `package.json` and run:

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Open the local address printed by Next.js, usually http://localhost:3000. Ollama listens on port 11434 by default. The first upload also downloads the multilingual embedding model to `data/model-cache/` for reuse.

## Try it

1. Open **Manage documents**, choose [the Nimbo Observatory sample](data/sample-docs/observatorio-nimbo.md) and select **Index document**. Its name and chunk count appear when indexing finishes.
2. Return to the chat and ask **What time does the Nimbo observatory open?** The Spanish document gives the time as **07:43**. Expand the citation to see the file name, chunk number and original passage. The confidence label shows the model’s own estimate.
3. Ask **How much does nighttime admission cost at Nimbo?** The sample omits the price, so the expected result is an abstention with no citations. The chat displays progress if the model requests another search.
4. Upload your own UTF-8 Markdown or text files, up to **256 KiB** each. **Delete** removes a document and its chunks from SQLite. Reloading the chat clears the conversation stored in the tab.

## Choose a provider

Edit `.env.local` in the project root and restart Next.js. On Windows, check that the filename ends in `.local`. The [example configuration](.env.example) lists the defaults.

| `LLM_PROVIDER` | Configuration |
|---|---|
| `ollama` | `OLLAMA_MODEL`, `OLLAMA_BASE_URL` |
| `openai` | `OPENAI_MODEL`, `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_MODEL`, `ANTHROPIC_API_KEY` |

Choose a model available to your account or installation that supports structured output and tool calls. With a remote provider, the server sends the question, included conversation history and retrieved passages to that provider. Embeddings run locally in all three configurations. Keep credentials in the local environment file, which Git ignores.

## Tests and evaluation

Run from the project root:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run eval
```

Unit tests use simulated providers. The evaluation uses the configured provider and indexes the three example documents in an in-memory SQLite database. It prints the answers, cited documents and metrics for 12 answerable questions and three that require abstention. Scoring checks accepted answer variants and the expected source passage. It can miss a valid paraphrase or accept a contradictory sentence containing the expected phrase. [Evaluation dataset](evals/dataset.json) · [Recorded Ollama results](evals/RESULTS.md)

## Design

Follow a question from retrieval to its displayed citation in the [architecture guide](docs/ARCHITECTURE.md). The [decision record](docs/DECISIONS.md) covers storage, multilingual search, validation and the trade-offs as the collection grows.
