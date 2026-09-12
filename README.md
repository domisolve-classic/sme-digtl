# Qatar Construction Site Risk Assessment Generator

An AI-assisted web app that generates Construction Site Risk Assessment
matrices tailored to Qatar, grounded in a curated reference library of
Qatar Construction Specifications (QCS 2014) and Qatar Labour Law (Decree
No. 14 of 2004), with Qatar's mandated summer working-hours restrictions
enforced by deterministic backend logic rather than left to the LLM.

See [SPEC.md](./SPEC.md) for the full design spec (architecture, schema,
sample system prompt, edge cases, roadmap).

## Stack

- Next.js (App Router) + React + Tailwind CSS
- Next.js API routes (Node) for prompt engineering / LLM calls
- Supabase (Postgres) for the hazard reference library and saved assessments
- Anthropic Claude (Sonnet) via structured tool-use output
- `@react-pdf/renderer` for PDF export
- Vitest for unit tests

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** and run the migrations in
   `supabase/migrations/` in order (via the Supabase SQL editor, or the
   Supabase CLI: `supabase db push`):
   - `0001_init.sql` - schema
   - `0002_seed.sql` - curated Qatar hazard/QCS reference library seed data

3. **Configure environment variables.** Copy `.env.example` to `.env.local`
   and fill in:

   ```bash
   cp .env.example .env.local
   ```

   - `ANTHROPIC_API_KEY` - Anthropic API key (server-side only)
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - from your Supabase
     project settings

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Without Supabase configured, the form still renders on `/`, but
   `/history`, `/new?from=...`, and assessment detail pages show a setup
   notice instead of crashing.

5. **Run tests**

   ```bash
   npm test
   ```

   Covers the deterministic climate/heat-ban rule module
   (`src/lib/climate.test.ts`), including the June 1 / September 15
   boundary dates for Qatar's mandated midday work ban.

## Known MVP Limitations

- **No authentication.** This is a single-tenant tool: anyone with the
  app's URL can view, edit, and generate assessments. Do not deploy this
  publicly with sensitive project data without adding auth first (the DB
  schema already includes a nullable `user_id` column to support this
  later without a migration).
- **Reference library is a starting point, not a certified source.** The
  seed data in `supabase/migrations/0002_seed.sql` was compiled from
  general public knowledge of QCS 2014 and Qatar Labour Law. A licensed
  Qatar HSE professional should review and expand it before any
  production or regulatory-facing use.
- **Rate limiting is process-local** (in-memory, per the current server
  process). It bounds runaway LLM cost on a single instance but resets on
  redeploy and does not coordinate across multiple serverless instances.
  Swap for a Redis/Upstash-backed counter for a real production deployment.
- **English only.** No Arabic/bilingual output in this MVP.
- **No live weather API.** Climate conditions are user-selected (with a
  seasonal default suggestion), not pulled from a live weather service.
- **Every generated assessment is a draft.** The app enforces a human
  sign-off step (reviewer name + role) before an assessment is marked
  reviewed, and re-opens a signed-off assessment to draft status if edited
  afterward - this is a deliberate safety/liability guardrail, not a bug.
