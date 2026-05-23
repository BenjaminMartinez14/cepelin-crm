-- Schema: KAM mini-CRM core tables.
-- Money math is never stored here; see 0002_metrics.sql for computed fields.

create extension if not exists "pgcrypto";

-- Enums ---------------------------------------------------------------------
create type company_status as enum ('enrolled', 'active', 'recurring');
create type invoice_status as enum (
  'issued',
  'assigned_cepelin',
  'assigned_competitor',
  'in_collection',
  'collected'
);
create type country as enum ('CL', 'MX');

-- Tables --------------------------------------------------------------------
create table kams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table companies (
  id                 uuid primary key default gen_random_uuid(),
  kam_id             uuid not null references kams (id) on delete cascade,
  name               text not null,
  tax_id             text not null unique,          -- RUT (CL) / RFC (MX)
  country            country not null default 'CL',
  status             company_status not null default 'enrolled',
  enrolled_at        timestamptz not null default now(),
  credit_limit       numeric(14, 2) not null default 0,  -- set by Risk, read-only for KAM
  next_followup_date date,
  is_demo            boolean not null default false,      -- cloneable demo portfolio flag

  -- Part 2 (AI health score) — nullable, populated later without a migration.
  health_score        integer,
  churn_risk          text check (churn_risk in ('low', 'medium', 'high')),
  ai_summary          text,
  recommended_actions jsonb,
  ai_generated_at     timestamptz
);

create table contacts (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name       text not null,
  phone      text,
  email      text
);

create table debtors (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  tax_id text not null unique
);

create table invoices (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  debtor_id  uuid not null references debtors (id) on delete restrict,
  amount     numeric(14, 2) not null,
  issued_at  date not null,
  status     invoice_status not null default 'issued'
);

create table notes (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  kam_id     uuid not null references kams (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

-- Indexes -------------------------------------------------------------------
create index idx_companies_kam      on companies (kam_id);
create index idx_companies_is_demo  on companies (is_demo) where is_demo;
create index idx_invoices_company   on invoices (company_id);
create index idx_invoices_debtor    on invoices (debtor_id);
create index idx_invoices_status    on invoices (status);
create index idx_notes_company_date on notes (company_id, created_at desc);
