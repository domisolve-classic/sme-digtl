-- Qatar Construction Site Risk Assessment Generator — initial schema
-- See SPEC.md section 4 for design rationale.

create extension if not exists "pgcrypto";

-- Curated Qatar reference library (seeded manually, editable via DB/admin later)
create table hazard_library (
  id uuid primary key default gen_random_uuid(),
  project_type text not null,
  activity text not null,
  hazard_description text not null,
  default_likelihood int not null check (default_likelihood between 1 and 5),
  default_severity int not null check (default_severity between 1 and 5),
  standard_control_measures text not null,
  regulatory_reference text,
  climate_trigger text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hazard_library_project_activity_idx
  on hazard_library (project_type, activity);
create index hazard_library_climate_trigger_idx
  on hazard_library (climate_trigger);

-- Deterministic Qatar climate/regulatory rules (reference only; the app's
-- evaluateClimateRules() encodes the authoritative logic in code — this
-- table documents the same facts for transparency/audit, it is not read
-- at request time to decide dates).
create table climate_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text unique not null,
  description text not null,
  effective_start_month int,
  effective_end_month int,
  effective_start_time time,
  effective_end_time time,
  legal_reference text not null,
  applies_to text not null
);

-- Generated assessments
create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  project_type text not null,
  activity text not null,
  location_context text,
  assessment_date date not null,
  expected_conditions text[] not null default '{}',
  crew_size int,
  work_duration text,
  existing_controls text,
  climate_flags jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'reviewed')),
  reviewer_name text,
  reviewer_role text,
  reviewed_at timestamptz,
  duplicated_from uuid references assessments(id) on delete set null,
  llm_model text,
  raw_llm_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_created_at_idx on assessments (created_at desc);
create index assessments_status_idx on assessments (status);

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
  hazard_library_id uuid references hazard_library(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessment_rows_assessment_id_idx on assessment_rows (assessment_id, sort_order);

-- Keep updated_at fresh on edit.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hazard_library_set_updated_at
  before update on hazard_library
  for each row execute function set_updated_at();

create trigger assessments_set_updated_at
  before update on assessments
  for each row execute function set_updated_at();

create trigger assessment_rows_set_updated_at
  before update on assessment_rows
  for each row execute function set_updated_at();

-- MVP is single-tenant with no auth: enable RLS but allow anon full access
-- via the anon key, matching the "anyone with the link" access model
-- documented in SPEC.md / README.md. Tighten this before adding real auth.
alter table hazard_library enable row level security;
alter table climate_rules enable row level security;
alter table assessments enable row level security;
alter table assessment_rows enable row level security;

create policy "anon full access" on hazard_library for all using (true) with check (true);
create policy "anon full access" on climate_rules for all using (true) with check (true);
create policy "anon full access" on assessments for all using (true) with check (true);
create policy "anon full access" on assessment_rows for all using (true) with check (true);
