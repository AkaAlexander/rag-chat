# RAG Chat

Chat sobre documentos propios. Indexa un archivo en `/documents`, vuelve al chat y pregunta por un dato del texto. Despliega la referencia numerada de la respuesta para leer el fragmento original.

## Arranque local

Desde la carpeta del proyecto, con Node.js 24 y npm, ejecuta en PowerShell:

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Abre http://localhost:3000. Para conversar con el proveedor inicial, instala y arranca Ollama y descarga el modelo con `ollama pull qwen3:4b`. Si ya tienes otro modelo de chat, indica su nombre en `OLLAMA_MODEL`. Para usar un proveedor remoto, cambia `LLM_PROVIDER` a `anthropic` u `openai` y configura su clave y un modelo disponible en tu cuenta en `.env.local`. Reinicia el servidor después de cambiar estas variables.

El navegador conserva la conversación mientras la página está abierta y envía hasta diez turnos anteriores. Cada pregunta admite 4000 caracteres. La ruta usa un límite en memoria de diez solicitudes por minuto. En desarrollo local se comparte un único cupo. Detrás de un proxy que sobrescribe `X-Real-IP` y es la única entrada al servidor, configura `TRUST_PROXY=true` para aplicar el límite por IP.

## Documentos

En `/documents` puedes indexar archivos Markdown y texto UTF-8 de hasta 256 KiB. El servidor divide el texto en ventanas de 80 unidades con 16 de solapamiento (las palabras largas se subdividen) y calcula vectores multilingües de 384 dimensiones en CPU. La primera ingesta descarga el modelo y lo guarda en `data/model-cache/`. SQLite conserva el texto original, los fragmentos y sus vectores en `data/rag.sqlite`. Borrar un documento elimina también sus fragmentos. Para cada pregunta se calcula la similitud coseno con los vectores guardados. Los cuatro mejores fragmentos que alcanzan 0,35 pueden llegar al modelo. Este umbral inicial se evaluará en la fase 6. El servidor comprueba las referencias antes de mostrar la respuesta y obtiene las citas del texto guardado. Si falta evidencia o las referencias son inválidas, el chat indica que no encuentra la respuesta.

## Comprobaciones

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

La interfaz está en `src/app/`, la validación de entorno en `src/lib/config.ts` y sus pruebas en `tests/`.
