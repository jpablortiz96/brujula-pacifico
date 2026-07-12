# Agentic AI

BRUJULA usa IA agentica con tool use. No usa RAG vectorial, embeddings ni vector store.

Codigo real:

- `lib/agent/tools.ts`
- `lib/agent/system-prompt.ts`
- `app/api/agent/chat/route.ts`
- `lib/agent/run-agent.ts`

Propiedades:

- 9 herramientas reales.
- Streaming SSE en web.
- Maximo 5 iteraciones en web.
- Maximo 4 iteraciones por defecto en WhatsApp.
- Citaciones derivadas de catalogo de datasets.
- Registro best-effort en bitacora.

