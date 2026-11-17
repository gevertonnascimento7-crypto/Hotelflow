# HotelFlow

Aplicativo (PWA instalável) para equipes de **hotéis, resorts e pousadas**. Interface minimalista, mobile-first, em **português brasileiro (padrão), inglês e espanhol**, com modo claro e escuro.

## Funcionalidades

| # | Módulo | O que faz |
|---|--------|-----------|
| 1 | **Troca de turnos** | Funcionário pede troca ou cobertura → colega aceita → supervisor aprova → a escala é atualizada sozinha. |
| 2 | **Governança** | Checklists de arrumação por quarto, com modelos editáveis, progresso, observações e inspeção do supervisor. |
| 3 | **Manutenção** | Chamados com foto, prioridade e responsável, atualizados **em tempo real**, com comentários. |
| 4 | **Frases prontas** | +50 frases em **português, inglês e espanhol**, com busca, copiar e ouvir a pronúncia (voz do aparelho). O hotel pode cadastrar frases próprias. |
| 5 | **Guia local** | Passeios, eventos, gastronomia e serviços; abrir no mapa e enviar ao hóspede. |
| 6 | **Achados e perdidos** | Registro com foto (câmera do celular), busca, devolução e descarte. |
| 7 | **Treinamento** | 5 módulos essenciais com teste rápido + módulos do próprio hotel; progresso da equipe. |
| 8 | **Escala, folgas e banco de horas** | Escala semanal, pedidos de folga com aprovação e banco de horas com saldo. |
| 9 | **Roteiros da recepção** | Check-in, check-out, reclamação e mais, com a fala no idioma do hóspede. |
| 10 | **Câmbio** | Conversor com cotações reais (AwesomeAPI em tempo real + ExchangeRate-API, reserva no BCE) e cache offline. |

Também inclui: login e contas individuais, permissões (**Administrador**, **Supervisor**, **Funcionário**), convite da equipe por código, avisos no app e **notificações push**, idioma e tema salvos na conta, funcionamento offline básico e instalação na tela inicial (Android e iPhone).

## Tecnologias

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Supabase**: Postgres, Auth, Storage (fotos), Realtime
- **PWA**: manifesto, service worker próprio, Web Push (VAPID)
- **Playwright**: testes unitários, de segurança e de ponta a ponta

## Segurança

- Cada hotel é isolado no banco por **Row Level Security** (RLS): ninguém lê ou altera dados de outro hotel, nem forjando o `hotel_id`.
- Permissões validadas **no banco**, não só na tela: funcionário não consegue se promover, editar escala ou aprovar pedidos.
- Fluxos de aprovação (trocas, folgas, horas) só por funções seguras (`security definer`) com validação de estado.
- Fotos em bucket **privado**, uma pasta por hotel, apenas imagens até 5 MB, acesso por URL assinada temporária.
- Código de convite com ~49 bits de entropia e bloqueio após 8 tentativas erradas em 15 minutos.
- A chave `service_role` só existe no servidor (rotas de push); nunca vai para o navegador.
- Cabeçalhos HTTP de segurança (HSTS, `X-Frame-Options`, `nosniff` etc.).

---

## Como publicar (tudo pelo celular)

Você vai usar três serviços gratuitos: **GitHub** (o código já está lá), **Supabase** (banco de dados) e **Vercel** (hospedagem). Faça tudo no Chrome do Android.

### 1. Criar o banco de dados no Supabase

1. Acesse **supabase.com** → **Start your project** → entre com o **GitHub**.
2. **New project**: nome `hotelflow`, crie uma senha forte para o banco (guarde-a) e escolha a região **South America (São Paulo)**. Aguarde ~2 minutos.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) no GitHub, toque nos três pontinhos → **Copy** (ou abra em *Raw* e copie tudo).
4. No Supabase: **SQL Editor** → **New query** → cole tudo → **Run**. Deve aparecer *Success*.
5. Em **Authentication → Sign In / Providers → Email**, **desative "Confirm email"** e salve.
   > O e-mail gratuito do Supabase só envia mensagens para membros da sua conta Supabase. Desativando a confirmação, a equipe consegue criar contas na hora. Para produção com muitos usuários, configure um SMTP próprio (ex.: Resend) em *Authentication → Emails → SMTP* e reative a confirmação.
6. Em **Project Settings → API** (ou no botão **Connect**), copie:
   - **Project URL**
   - **anon / publishable key**
   - **service_role / secret key** (secreta — só vai para a Vercel)

### 2. Publicar na Vercel

1. Acesse **vercel.com** → **Sign Up** → **Continue with GitHub**.
2. **Add New… → Project** → importe o repositório **hotelflow** (se pedido, autorize o acesso da Vercel ao repositório).
3. Antes de publicar, abra **Environment Variables** e adicione:

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (habilita push) |

4. Toque em **Deploy**. Em ~1 minuto você recebe o endereço, por exemplo `https://hotelflow-seunome.vercel.app`.
5. Volte ao Supabase → **Authentication → URL Configuration**:
   - **Site URL**: o endereço da Vercel
   - **Redirect URLs**: adicione `https://SEU-ENDERECO.vercel.app/**`

> **Alternativa automática:** na Vercel, em **Storage → Supabase → Create**, a integração cria o banco e as variáveis sozinha. O build do HotelFlow aplica as migrações automaticamente quando encontra `POSTGRES_URL_NON_POOLING`. Se algo falhar, o app mostra a tela "Banco de dados não encontrado" e basta fazer o passo 1.3–1.4.

### 3. Abrir e instalar no Android

1. Abra o endereço da Vercel no **Chrome**.
2. Toque em **Criar conta** → depois **Criar hotel** (você vira o administrador).
3. Instale: menu **⋮** → **Instalar app** (ou **Adicionar à tela inicial**). Também há o botão **Ajustes → Instalar o app**.
4. Abra pelo ícone **HotelFlow** na tela inicial e ative **Ajustes → Notificações → Ativar notificações**.
5. Convide a equipe em **Ajustes → Equipe e convites → Compartilhar** (envia link + código pelo WhatsApp). Lá você também define função (Funcionário/Supervisor/Administrador) e setor de cada pessoa.

**iPhone:** abra no **Safari** → **Compartilhar** → **Adicionar à Tela de Início**. Notificações push funcionam no iOS 16.4+ com o app instalado.

### Idiomas

Português brasileiro é o padrão. Cada pessoa escolhe **Português, English ou Español** em **Ajustes → Idioma** (ou nas telas de login). A escolha é salva na conta e vale em qualquer aparelho; avisos e notificações push chegam no idioma de quem recebe.

---

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # http://localhost:3000
```

| Comando | Para quê |
|---------|----------|
| `npm run build` | Aplica migrações (se houver URL do banco) e gera o build |
| `npm run db:bundle` | Regera `supabase/schema.sql` a partir de `supabase/migrations/` |
| `npm run db:migrate` | Aplica as migrações usando `DATABASE_URL` |
| `npm run icons` | Regera os ícones do PWA |
| `npm run typecheck` | Checagem de tipos |
| `npm run test:e2e` | Todos os testes (unitários, segurança e ponta a ponta) |

### Testes com Supabase local

`tests/local-supabase/start.sh` sobe Postgres, Auth, REST, Storage e Realtime em Docker; `gateway.mjs` faz o papel do Kong na porta 54321.

```bash
bash tests/local-supabase/start.sh
node tests/local-supabase/gateway.mjs &
for f in supabase/migrations/*.sql; do PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f "$f"; done
npm run build:app && npx next start -p 3000 &
npm run test:e2e
```

### Estrutura

```
src/app/(auth)/        login, cadastro, recuperação de senha
src/app/(app)/         telas internas (um diretório por módulo)
src/app/api/           câmbio (rates) e push (key, dispatch)
src/components/        UI minimalista, provedores (auth, idioma, tema, avisos)
src/content/           frases, treinamentos e roteiros em pt-BR/en/es
src/i18n/              dicionários pt-BR (base), en e es com chaves tipadas
supabase/migrations/   banco: tabelas, RLS, funções, storage, realtime
public/sw.js           service worker (offline + push)
tests/                 testes Playwright e Supabase local
```
