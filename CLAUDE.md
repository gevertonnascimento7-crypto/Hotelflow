@AGENTS.md

# HotelFlow — notas para o agente

- PWA Next.js 16 (App Router, Turbopack) + Supabase. Todas as telas são componentes cliente; a segurança está nas políticas RLS em `supabase/migrations/`.
- Idiomas: somente `pt-BR` (padrão), `en` e `es`. `src/i18n/messages/pt-BR.ts` é a fonte das chaves; `en.ts`/`es.ts` são tipados com `Messages`, então chave faltando quebra o `tsc`. Nunca escreva texto de interface fora dos dicionários.
- Mudança no banco: crie uma nova migração idempotente em `supabase/migrations/` e rode `npm run db:bundle` para atualizar `supabase/schema.sql`.
- Erros de RPC usam o prefixo `HF:<codigo>`; o código precisa existir em `errors.*` nos três dicionários.
- Antes de concluir: `npm run typecheck`, `npm run build:app` e `npm run test:e2e` (ver README para subir o Supabase local).
