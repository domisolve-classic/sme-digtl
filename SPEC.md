# Qatar Construction Site Risk Assessment Generator — Spec

## 1. Overview

A web app that generates structured, Qatar-specific Construction Site Risk
Assessments (hazard matrices) from a short project-details form, using an
LLM (Claude) constrained by a curated local reference library of Qatar
Construction Specifications (QCS 2014) and Qatar Labour Law (Decree No. 14
of 2004) hazard/control data. Output is an editable on-screen risk matrix
that can be signed off by a human HSE reviewer and exported to PDF.

**Positioning:** this is an AI-assisted drafting tool, not an autonomous
compliance authority. Every generated assessment is a draft until a named
human reviewer signs it off.

## 2. Tech Stack

- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend:** Next.js API routes (Node.js runtime) — one deployable
- **Database:** Supabase (Postgres), accessed via `@supabase/supabase-js`
- **LLM:** Anthropic Claude (Sonnet), called server-side only via the
  Anthropic TypeScript SDK — API key never reaches the client
- **PDF export:** server-rendered PDF (e.g. `@react-pdf/renderer` or
  Puppeteer-based HTML→PDF) generated from the finalized assessment
- **Auth:** none for MVP (single-tenant, no login) — schema includes a
  nullable `user_id` column throughout so auth can be turned on later
  without a migration
- **Rate limiting:** per-IP/session sliding window (e.g. Upstash Redis or
  an in-memory/Postgres-backed counter), default 10 generations/hour

## 3. User Flow

1. User fills the **Assessment Request Form**:
   - Project Type (select: high-rise / infrastructure / excavation /
     road works / MEP / demolition / other)
   - Specific Activity (select from a curated list per project type, e.g.
     scaffolding erection, welding/hot work, working at heights, confined
     space entry, excavation/trenching, crane lifting, concrete pouring —
     plus free-text "other activity")
   - Location context (site type: urban/coastal/desert-open — affects
     wind/sand exposure)
   - Assessment Date (defaults to today) — drives the deterministic
     heat-ban/season check
   - Expected Conditions (multi-select: extreme heat, high humidity, dust
     storm risk, high wind, normal) — pre-populated with a suggested
     default based on the date (see §5) but always user-editable
   - Optional: crew size, work duration, existing site controls already
     in place
2. On submit, backend:
   a. Runs deterministic Qatar climate/regulatory checks against the date
      and conditions (§5).
   b. Retrieves matching hazard/control reference entries from the
      curated library for the given Project Type + Activity (§6).
   c. Builds the system + user prompt (§7) including both of the above as
      grounding context, and calls Claude with a strict JSON schema via
      tool-use/structured output.
   d. Validates the response against the schema; on failure, retries once
      with a corrective message; on second failure, returns a clear error
      (no partial/malformed table is ever rendered).
   e. Persists the assessment as a draft row.
3. Frontend renders an **editable risk matrix table**: each row is
   Hazard | Risk Rating Before (L×S, band, color) | Control Measures |
   Risk Rating After (L×S, band, color) | QCS/Law reference. Every cell is
   inline-editable. A persistent banner at the top surfaces the
   deterministic climate/regulatory flags (e.g. "⚠ Midday work ban in
   effect for this date: 10:00–15:30, per Ministerial Decision").
4. User edits as needed, then must enter a **Reviewer Name + role** and
   click "Sign Off" to finalize. Finalizing locks the row from further
   silent edits (further edits create a new revision, not an overwrite)
   and stamps a "DRAFT — Reviewed by [name], [role], [date]" watermark
   removal / replaces the "DRAFT — Requires review" watermark with the
   sign-off line.
5. User exports to PDF (available before or after sign-off; unreviewed
   exports are watermarked "DRAFT — NOT YET REVIEWED" prominently).
6. User can browse a list of past assessments (no auth = all assessments
   are visible to anyone with the link, single-tenant), and duplicate any
   past one as a starting point for a new form submission.

## 4. Database Schema (Supabase / Postgres)

```sql
-- Curated Qatar reference library (seeded manually, editable via DB/admin later)
create table hazard_library (
  id uuid primary key default gen_random_uuid(),
  project_type text not null,          -- e.g. 'high-rise', 'excavation'
  activity text not null,              -- e.g. 'scaffolding erection'
  hazard_description text not null,
  default_likelihood int not null check (default_likelihood between 1 and 5),
  default_severity int not null check (default_severity between 1 and 5),
  standard_control_measures text not null,
  regulatory_reference text,           -- e.g. 'QCS 2014 Section 5 Part 3, Clause 5.3.2'
  climate_trigger text,                -- e.g. 'extreme_heat', 'dust_storm', null if not climate-related
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deterministic Qatar climate/regulatory rules (not left to the LLM)
create table climate_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text unique not null,       -- e.g. 'midday_work_ban'
  description text not null,           -- human-readable rule summary
  effective_start_month int,           -- e.g. 6 (June)
  effective_end_month int,             -- e.g. 9 (September)
  effective_start_time time,           -- e.g. 10:00
  effective_end_time time,             -- e.g. 15:30
  legal_reference text not null,       -- e.g. 'Ministerial Decision No. 16 of 2007'
  applies_to text not null             -- 'outdoor_work', 'all_construction', etc.
);

-- Generated assessments
create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,                   -- nullable now; populated once auth exists
  project_type text not null,
  activity text not null,
  location_context text,
  assessment_date date not null,
  expected_conditions text[] not null,  -- e.g. ARRAY['extreme_heat','high_wind']
  crew_size int,
  work_duration text,
  existing_controls text,
  climate_flags jsonb,                  -- deterministic flags applied, e.g. [{rule_key, message}]
  status text not null default 'draft', -- 'draft' | 'reviewed'
  reviewer_name text,
  reviewer_role text,
  reviewed_at timestamptz,
  duplicated_from uuid references assessments(id),
  llm_model text,                       -- model used, for audit trail
  raw_llm_response jsonb,               -- store the original structured output for audit
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual risk matrix rows (editable independently of the parent record)
create table assessment_rows (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  sort_order int not null,
  hazard text not null,
  likelihood_before int not null check (likelihood_before between 1 and 5),
  severity_before int not null check (severity_before between 1 and 5),
  risk_score_before int generated always as (likelihood_before * severity_before) stored,
  control_measures text not null,
  likelihood_after int not null check (likelihood_after between 1 and 5),
  severity_after int not null check (severity_after between 1 and 5),
  risk_score_after int generated always as (likelihood_after * severity_after) stored,
  regulatory_reference text,
  hazard_library_id uuid references hazard_library(id), -- null if LLM-generated, not from library
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Risk band mapping (derived in application code from `risk_score`, not
stored redundantly): 1–4 Low, 5–9 Medium, 10–15 High, 16–25 Extreme
(standard 5×5 QCS-style banding).

## 5. Deterministic Climate/Regulatory Logic (backend code, not LLM)

Implemented as a pure function `evaluateClimateRules(date, conditions) →
ClimateFlag[]`, driven by the `climate_rules` table:

- **Midday work ban**: if `assessment_date` falls between June 1 and
  September 15 (configurable via `climate_rules` row), flag that outdoor
  work is prohibited 10:00–15:30 per the relevant Ministerial Decision,
  regardless of what the LLM says. This flag is injected into the prompt
  as a fact ("the following is legally mandated and must be reflected in
  the assessment") and also rendered as a standalone UI banner.
- **Dust storm / high wind selected**: injects a fact block noting
  QCS-relevant precautions (crane/lifting suspension thresholds, visibility
  requirements) — these come from `hazard_library` entries tagged with
  `climate_trigger`, not invented by the LLM.
- **Extreme heat/humidity selected outside the ban window**: still injects
  general heat-stress mitigation requirements (hydration schedules, shaded
  rest areas, buddy system) per Qatar Labour Law heat-stress provisions.

The LLM is told these facts are authoritative and must be incorporated
into relevant hazard rows — it does not decide the ban dates/times itself.

## 6. RAG-lite Grounding

On each generation request:
1. Query `hazard_library` for rows matching the selected `project_type`
   AND `activity` (fallback to `project_type` only if no exact activity
   match).
2. Query rows where `climate_trigger` matches any of the selected
   `expected_conditions`.
3. Concatenate the matched rows (hazard description, default L/S, standard
   controls, regulatory reference) into the prompt as a **reference
   library excerpt** the model must ground its answer in — it may add
   additional hazards beyond the library, but any regulatory clause number
   it cites must either come from the library or be a well-known,
   non-specific reference (e.g. "Qatar Labour Law, Decree No. 14 of 2004"
   without a fabricated clause number).

Seed data: an initial `hazard_library` dataset (~30–50 rows) covering the
project types/activities listed in §3, based on general public knowledge
of QCS 2014 and Qatar Labour Law heat-stress/H&S provisions, will be
included as a seed SQL/migration file. **This seed data is a starting
point, not a certified compliance source — flagged clearly in README and
in-app footer that a licensed Qatar HSE professional must review/expand
this library before any production/regulatory use.**

## 7. LLM Integration

- **Model:** `claude-sonnet-5` (current Sonnet), called server-side via
  Anthropic SDK, using **tool use / structured output** to force a JSON
  response matching a strict schema (array of `{hazard, likelihood_before,
  severity_before, control_measures, likelihood_after, severity_after,
  regulatory_reference}`).
- **Validation:** Zod (or equivalent) schema validation of the tool-use
  result server-side before persisting. On validation failure: one retry
  with an appended corrective instruction ("your previous response was
  invalid because X; return valid JSON matching the schema exactly"). On
  second failure: return HTTP 502 with a user-facing "Generation failed,
  please try again" message — never render partial/guessed data.
- **Rate limiting:** sliding-window counter (per IP, or per browser session
  cookie) capped at 10 generations/hour, enforced in the API route before
  the LLM call; returns 429 with a clear message when exceeded.

### Sample System Prompt

```
You are a Qatar-based construction health & safety specialist producing a
Construction Site Risk Assessment matrix. Your output must comply with:
- Qatar Labour Law, Decree No. 14 of 2004 (occupational health & safety
  provisions, including heat-stress/working-hours rules)
- Qatar Construction Specifications (QCS 2014), health & safety sections

You will be given:
1. Project type and specific activity
2. Site/location context
3. A set of DETERMINISTIC REGULATORY FACTS that are legally mandated for
   this date/conditions and MUST be reflected in your hazard rows exactly
   as stated — you must not contradict or soften them
4. A REFERENCE LIBRARY EXCERPT of known hazards, standard control
   measures, and regulatory references for this project type/activity —
   ground your answer in these where they apply; you may add hazards
   beyond this list based on standard GCC construction safety practice,
   but do not invent specific QCS clause numbers or law article numbers
   that are not provided to you. If you are not given a specific clause
   number, cite the law/spec by name only (e.g. "Qatar Labour Law, Decree
   No. 14 of 2004") without a fabricated section number.

For each identified hazard, you must return, via the `submit_risk_matrix`
tool:
- hazard: a specific, concrete hazard description (not generic)
- likelihood_before / severity_before: integers 1-5 (5x5 matrix, before
  any mitigation is applied)
- control_measures: specific, actionable control measures appropriate to
  a Qatar construction site (engineering controls first, then
  administrative, then PPE — reflect hierarchy of controls)
- likelihood_after / severity_after: integers 1-5, reflecting residual
  risk after the stated control measures are correctly implemented
- regulatory_reference: the QCS/law reference if provided in the
  reference library, otherwise a generic named reference, otherwise null

Cover at minimum: hazards specific to the stated activity, plus any
hazard implied by the deterministic regulatory facts you were given
(e.g. heat stress controls if a midday work ban applies). Do not omit a
mandated regulatory fact from the output. Produce 6-12 hazard rows —
enough to be genuinely useful on a real site, not padded with duplicates.

This output is a DRAFT for review by a licensed HSE professional before
use — do not claim certainty beyond what a professional draft warrants.
```

The user-turn message is built from the form fields, the deterministic
climate flags (§5), and the retrieved `hazard_library` excerpt (§6),
formatted as structured sections, not free prose.

## 8. Edge Cases & Failure Modes

- **LLM returns fewer/more rows than expected, or omits a mandated
  climate flag hazard**: schema validation catches missing required
  fields; a post-validation check confirms at least one row references
  each active deterministic climate flag (e.g. if midday ban is active,
  at least one row must mention heat/working-hours) — if missing, trigger
  the corrective retry.
- **User selects an Activity not in the curated library**: still allowed
  via free-text; reference library excerpt will be empty/partial for
  that activity, and the system prompt instructs the LLM to rely on
  general GCC practice and avoid specific clause citations in that case.
- **Duplicate/reuse of a past assessment with an old date**: duplicating
  copies the form inputs but resets `assessment_date` to today and
  re-runs the deterministic climate check (a summer-dated assessment
  duplicated in winter should not carry a stale heat-ban flag).
- **Editing after sign-off**: edits after `status = 'reviewed'` do not
  silently overwrite; the UI requires confirming "this will revert to
  draft status and require re-sign-off" — reviewed rows are never
  silently mutated.
- **Rate limit hit**: clear 429 UI message with a countdown/retry hint,
  not a generic error.
- **LLM/API outage**: generation button shows a clear "AI service
  unavailable, try again shortly" state; no retry-storming (single retry
  only, per above).
- **No auth = no data isolation**: since there's no login, explicitly
  document that this MVP is intended for internal/single-org use only
  (all saved assessments are visible to anyone with the link) — call this
  out in README as a known limitation, not a silent gap.

## 9. Roadmap (Build Order)

1. **Scaffold**: Next.js app, Tailwind, Supabase project + schema
   migration (§4), seed `hazard_library` and `climate_rules` data.
2. **Deterministic climate module**: `evaluateClimateRules()` + unit
   tests covering the ban window boundaries and each condition trigger.
3. **Form UI**: project details form, client-side validation, default
   condition suggestions based on date.
4. **LLM integration**: system prompt (§7), Anthropic SDK call with
   tool-use schema, Zod validation, retry-once logic, rate limiting.
5. **Generation API route**: wires form input → climate module →
   hazard_library query → LLM call → persist `assessments` +
   `assessment_rows`.
6. **Risk matrix UI**: editable table component with color-coded risk
   bands, inline cell editing, climate-flag banner.
7. **Sign-off flow**: reviewer name/role capture, status transition,
   watermark logic, "reopen to edit" confirmation.
8. **PDF export**: server-rendered PDF matching the on-screen matrix,
   watermark reflects draft/reviewed state.
9. **History/duplicate**: list of past assessments, duplicate-into-new-form
   action with date reset.
10. **Polish**: rate-limit UX, error states, README documenting the
    single-tenant limitation and the "seed data needs professional review"
    disclaimer.

## 10. Explicit Non-Goals (MVP)

- No authentication/multi-tenancy (schema is ready for it, not built)
- No Arabic/bilingual output
- No live weather API integration
- No admin UI for editing `hazard_library`/`climate_rules` (direct DB
  edits only for MVP)
- Not a certified/legally-binding compliance tool — always an AI-assisted
  draft requiring human sign-off
