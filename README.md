# reBlock

reBlock is a first-pass MVP for turning floating topic bubbles into curated Are.na research channels.

## Stack

- React, Vite, and TypeScript
- Tailwind v4 with `@theme` tokens
- shadcn/ui-compatible Button and Card components
- Vercel serverless functions in `/api`
- Claude API for structured research
- Are.na API for channel creation, block creation, and image sourcing

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add `ANTHROPIC_API_KEY`, `ARENA_CLIENT_ID`, `ARENA_CLIENT_SECRET`, and `ARENA_REDIRECT_URI`.
   The local redirect URI is usually `http://127.0.0.1:3000/api/arena/oauth/callback`.
4. Run `npm run dev` for the UI only, or `npx vercel dev` when testing the serverless API flow locally.

Vite serves the React app locally. On Vercel, `/api/research` and `/api/arena` run as serverless functions and keep API keys out of the client bundle.

Are.na publishing uses OAuth by default. A shared personal access token can only be enabled deliberately by setting `ARENA_DEMO_MODE=true` alongside `ARENA_API_KEY`; otherwise personal tokens are ignored.

## Scripts

- `npm run dev` starts the local app.
- `npm run build` type-checks and builds the client.
- `npm run lint` runs ESLint, including the token guardrail for raw Tailwind color classes.

## API access

All API routes require operator HTTP Basic authentication (`BASIC_AUTH_USER` and
`BASIC_AUTH_PASSWORD`); missing credentials deny access. The browser asks for
these credentials when loading the Are.na connection. OAuth authenticates the
Are.na account separately. API responses are private and never shared in CDN or
filesystem caches. Supplied source URLs are validated but never fetched by this
server. Production OAuth requires an explicit `ARENA_REDIRECT_URI`.
