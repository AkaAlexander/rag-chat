# RAG Chat

Aplicación de portfolio para preguntar en lenguaje natural sobre documentos propios. El servidor busca pasajes relevantes, pide al modelo una respuesta basada en ellos y muestra las fuentes para que puedas comprobarla. Incluye ejemplos en español, inglés y neerlandés.

## Instalación en Windows

Necesitas Node.js 24, npm y, para la configuración local, Ollama en ejecución. Desde PowerShell, comprueba las herramientas y descarga el modelo de conversación:

```powershell
node --version
npm.cmd --version
ollama --version
ollama pull qwen3:4b
```

Abre PowerShell en la carpeta `rag-chat`, donde está `package.json`. Instala las dependencias y crea la configuración para tu equipo:

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Abre la dirección `Local` que imprima Next.js, normalmente http://localhost:3000. Ollama atiende por defecto en el puerto 11434. La primera ingesta descarga además el modelo multilingüe de embeddings y lo guarda en `data/model-cache/`. Las siguientes ingestas reutilizan esa caché.

## Prueba de principio a fin

1. Desde el chat abre **Gestionar documentos**. Selecciona [observatorio-nimbo.md](data/sample-docs/observatorio-nimbo.md) y pulsa **Indexar documento**. La lista muestra el nombre y el número de fragmentos cuando termina.
2. Vuelve al chat y pregunta **¿A qué hora abre el observatorio Nimbo?** El dato esperado es **07:43**. Debajo de la respuesta verás la confianza estimada y una referencia desplegable con el nombre del documento, el número de fragmento y el texto original.
3. Pregunta **¿Cuánto cuesta la entrada nocturna del observatorio Nimbo?** El documento omite el precio. El resultado esperado es un rechazo sin citas. Si el modelo solicita otra búsqueda, el chat muestra su progreso.
4. Puedes subir tus propios archivos Markdown o texto UTF-8 de hasta **256 KiB** desde la misma página. **Borrar** elimina el documento y sus fragmentos de SQLite. El historial del chat vive en la pestaña y se pierde al recargarla.

## Elegir el modelo

Edita `.env.local` en la raíz del proyecto y reinicia el servidor. En Windows comprueba que el nombre termina en `.local`. La [configuración de ejemplo](.env.example) contiene los valores iniciales.

| Valor de `LLM_PROVIDER` | Variables del proveedor |
|---|---|
| `ollama` | `OLLAMA_MODEL` y `OLLAMA_BASE_URL` |
| `openai` | `OPENAI_MODEL` y `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_MODEL` y `ANTHROPIC_API_KEY` |

Elige un modelo con salida estructurada y llamadas a herramientas disponible en tu cuenta o instalación. Con un proveedor remoto, el servidor le envía la pregunta, el historial incluido y los fragmentos recuperados. Los embeddings se calculan en el equipo con cualquiera de los tres proveedores. Guarda las claves en el archivo local, excluido de Git.

## Pruebas y evaluación

Ejecuta desde la raíz:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run eval
```

Los tests unitarios usan proveedores simulados. La evaluación usa el proveedor configurado y una base SQLite en memoria con los tres documentos de ejemplo. Imprime las respuestas, las fuentes citadas y las métricas. El conjunto contiene 12 preguntas con respuesta y tres que requieren abstención. La puntuación busca variantes aceptadas del dato y comprueba el documento y el pasaje de referencia. Puede penalizar una paráfrasis válida o aceptar una frase contradictoria que incluya la variante esperada. [Preguntas y respuestas esperadas](evals/dataset.json) · [Resultados con Ollama](evals/RESULTS.md)

## Para la entrevista

Sigue una pregunta desde la ingesta hasta el fragmento citado en la [arquitectura](docs/ARCHITECTURE.md). Las [decisiones técnicas](docs/DECISIONS.md) explican los parámetros de búsqueda, las alternativas y qué habría que medir al aumentar el tamaño de la biblioteca.
