-- Queue a customer completion notification exactly once when a transfer first reaches payout_confirmed.
create table if not exists public.transfer_completion_notifications (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null unique references public.transfers(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  email_status text not null default 'queued'
    check (email_status in ('queued','sending','sent','failed','needs_review','skipped')),
  whatsapp_status text not null default 'queued'
    check (whatsapp_status in ('queued','sending','sent','failed','needs_review','skipped')),
  email_attempts integer not null default 0,
  whatsapp_attempts integer not null default 0,
  email_provider_id text,
  whatsapp_provider_id text,
  email_last_error text,
  whatsapp_last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transfer_completion_notifications_customer_idx
  on public.transfer_completion_notifications(customer_id, created_at desc);

alter table public.transfer_completion_notifications enable row level security;

drop policy if exists "Active team can view completion notification logs"
  on public.transfer_completion_notifications;
create policy "Active team can view completion notification logs"
on public.transfer_completion_notifications for select to authenticated
using (public.is_active_dirhamlink_team_member());

grant select on public.transfer_completion_notifications to authenticated;

create or replace function public.queue_transfer_completion_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'payout_confirmed'
     and old.status is distinct from 'payout_confirmed' then
    insert into public.transfer_completion_notifications(transfer_id, customer_id)
    values (new.id, new.customer_id)
    on conflict (transfer_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists queue_transfer_completion_notification
  on public.transfers;
create trigger queue_transfer_completion_notification
after update of status on public.transfers
for each row
execute function public.queue_transfer_completion_notification();

comment on table public.transfer_completion_notifications is
'Per-transfer email and WhatsApp delivery log. A unique transfer_id prevents duplicate notification jobs. Service-role server code performs provider delivery.';

notify pgrst, 'reload schema';
