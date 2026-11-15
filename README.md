# RAG Chat

Proyecto de portfolio para consultar documentos propios y citar los fragmentos que respaldan cada respuesta. La fase 1 incluye la portada y la configuración del servidor. El chat y la carga de documentos se incorporarán en fases posteriores.

## Arranque local

Desde la carpeta del proyecto, con Node.js 24 y npm, ejecuta en PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre http://localhost:3000. El proveedor inicial es Ollama. La portada funciona sin instalar modelos ni configurar claves. Para seleccionar un proveedor remoto, cambia `LLM_PROVIDER` a `anthropic` u `openai` y configura su clave en `.env.local`. Next.js valida la configuración al arrancar. Reinicia el servidor después de cambiar estas variables.

## Comprobaciones

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

La interfaz está en `src/app/`, la validación de entorno en `src/lib/config.ts` y sus pruebas en `tests/`.
