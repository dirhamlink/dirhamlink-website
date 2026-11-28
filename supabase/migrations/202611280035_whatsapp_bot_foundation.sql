-- WhatsApp bot foundation: registration submissions are kept separate from verified auth accounts.
-- A WhatsApp message alone must not silently grant a website login or bypass identity checks.

create table if not exists public.whatsapp_bot_sessions (
  wa_id text primary key check (wa_id ~ '^[0-9]{7,15}$'),
  state text not null default 'idle' check (state in ('idle','consent','name','email')),
  pending_name text,
  consent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_customer_registrations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique check (wa_id ~ '^[0-9]{7,15}$'),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  email text,
  consent_at timestamptz not null,
  status text not null default 'pending_review' check (status in ('pending_review','linked','rejected')),
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_registrations_created_idx
  on public.whatsapp_customer_registrations(created_at desc);

alter table public.whatsapp_bot_sessions enable row level security;
alter table public.whatsapp_customer_registrations enable row level security;

-- Service-role webhook access only. No anon/authenticated policies are intentionally created.
revoke all on public.whatsapp_bot_sessions from anon, authenticated;
revoke all on public.whatsapp_customer_registrations from anon, authenticated;

drop policy if exists "Team can view WhatsApp registration requests" on public.whatsapp_customer_registrations;
create policy "Team can view WhatsApp registration requests"
on public.whatsapp_customer_registrations for select to authenticated
using (public.is_active_dirhamlink_team_member());

grant select on public.whatsapp_customer_registrations to authenticated;

comment on table public.whatsapp_customer_registrations is
'Pending WhatsApp-origin registration requests. These are not authenticated customer accounts until securely linked to auth.users.';
