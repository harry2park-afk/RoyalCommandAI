# RoyalCommand.ai

Production application for the Royal Household OS — Next.js, TypeScript, Tailwind, Supabase-ready, multi-AI orchestration.

## Quick start (local demo)

```bash
npm install
npm run dev
```

Open http://localhost:3000

Demo login:

- Email: `owner@royalcommand.ai`
- Password: `password123`

Without provider API keys, the app runs in **AI demo mode** and still orchestrates ChatGPT/Claude/Gemini/Grok connectors with simulated responses, comparison, and a final synthesized answer.

## Enable live AI providers

Copy `.env.example` to `.env.local` and set:

```env
AI_DEMO_MODE=false
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_AI_API_KEY=...
XAI_API_KEY=...
```

## Enable Supabase (auth + database)

1. Create a Supabase project.
2. Run SQL in `supabase/migrations/001_init.sql` then `002_rls.sql`.
3. Set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Until Supabase is configured, local cookie sessions and in-memory store are used.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run typecheck
npm run lint
```

## Core API

- `POST /api/auth/signup|login|logout`
- `GET /api/auth/me`
- `GET|POST /api/rooms`
- `GET /api/rooms/:id`
- `POST /api/ai/chat` — fan-out to all selected providers, compare, synthesize
- `GET /api/ai/providers`
- `POST /api/ai/translate`
- `POST /api/documents/upload`
- `POST /api/voice`
- `GET /api/health`

## Deploy (Vercel)

1. Push repo to GitHub.
2. Import in Vercel.
3. Add environment variables from `.env.example`.
4. Deploy. Framework preset: Next.js.
