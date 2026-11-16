# Evaluation on November 16, 2026

Ollama ran `qwen3:4b` against three sample documents and 15 questions. The runner indexed the corpus in an in-memory SQLite database. The table reports the complete run with the expected abstention language checked.

| Metric | Passed | Percentage |
|---|---:|---:|
| Correct answers, including abstentions | 14/15 | 93.3% |
| Answerable questions with a correct citation | 11/12 | 91.7% |
| Correct abstentions in the expected language | 3/3 | 100% |

“Where do tours at Nimbo begin?” produced a runtime error and counted as a failure for both answer and citation. In an isolated retry, the chat answered “sala Bruma” and cited `observatorio-nimbo.md`. The cause of the intermittent error remains unknown. The evaluation script exits with a nonzero status if a request fails.

The first run exposed a Spanish abstention for a Dutch question starting with “Welk”. We corrected language detection and recorded each expected abstention in the dataset. All three abstentions passed the language check in the final run.
