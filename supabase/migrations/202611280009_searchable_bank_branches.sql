-- Searchable, centrally maintained bank branch directory for India, Nepal and Pakistan.
create table if not exists public.bank_branches (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country in ('India','Nepal','Pakistan')),
  bank_name text not null,
  city text,
  district text,
  branch_name text not null,
  branch_code text,
  ifsc text,
  is_active boolean not null default true,
  source_name text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bank_branches_lookup_idx
  on public.bank_branches (country, bank_name, city, is_active);
create index if not exists bank_branches_search_idx
  on public.bank_branches using gin (
    to_tsvector('simple', coalesce(bank_name,'') || ' ' || coalesce(city,'') || ' ' ||
      coalesce(district,'') || ' ' || coalesce(branch_name,'') || ' ' || coalesce(branch_code,'') || ' ' || coalesce(ifsc,''))
  );
alter table public.bank_branches enable row level security;
drop policy if exists "Anyone authenticated can read active bank branches" on public.bank_branches;
create policy "Anyone authenticated can read active bank branches"
  on public.bank_branches for select to authenticated using (is_active = true);
grant select on public.bank_branches to authenticated;

alter table public.beneficiaries
  add column if not exists bank_branch_code text;
alter table public.transfers
  add column if not exists recipient_bank_branch_code text;

-- Directory rows are loaded from official regulator/bank source files by an authorised operator.
-- Do not insert guessed or incomplete branch records.
