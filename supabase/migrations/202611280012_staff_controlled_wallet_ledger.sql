-- DirhamLink internal staff-controlled wallet ledger.
-- Customer balances are derived from immutable ledger entries; customers cannot write entries.
create table if not exists public.wallet_ledger (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id) on delete restrict,
 entry_type text not null check (entry_type in ('deposit_credit','transfer_debit','refund_credit','adjustment_credit','adjustment_debit')),
 amount_aed numeric(12,2) not null check (amount_aed > 0),
 source_deposit_id uuid references public.cash_deposit_submissions(id) on delete restrict,
 transfer_id uuid references public.transfers(id) on delete restrict,
 description text not null check (char_length(trim(description)) between 2 and 240),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check ((entry_type = 'deposit_credit' and source_deposit_id is not null and transfer_id is null)
     or (entry_type = 'transfer_debit' and transfer_id is not null and source_deposit_id is null)
     or (entry_type in ('refund_credit','adjustment_credit','adjustment_debit')))
);
create unique index if not exists wallet_one_credit_per_deposit
 on public.wallet_ledger(source_deposit_id) where entry_type='deposit_credit';
create unique index if not exists wallet_one_debit_per_transfer
 on public.wallet_ledger(transfer_id) where entry_type='transfer_debit';
create index if not exists wallet_ledger_customer_created
 on public.wallet_ledger(customer_id,created_at desc);
alter table public.wallet_ledger enable row level security;
drop policy if exists "Customers view own wallet ledger" on public.wallet_ledger;
create policy "Customers view own wallet ledger" on public.wallet_ledger
 for select to authenticated using(customer_id=auth.uid());
drop policy if exists "Team view wallet ledger" on public.wallet_ledger;
create policy "Team view wallet ledger" on public.wallet_ledger
 for select to authenticated using(public.is_active_dirhamlink_team_member());
revoke all on public.wallet_ledger from anon, authenticated;
grant select on public.wallet_ledger to authenticated;

-- Credit only after the existing staff deposit decision RPC marks funds verified.
create or replace function public.credit_verified_deposit_to_wallet()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='verified' and old.status is distinct from 'verified' then
   insert into public.wallet_ledger(customer_id,entry_type,amount_aed,source_deposit_id,description,created_by)
   values(new.customer_id,'deposit_credit',new.amount_aed,new.id,
     'Verified deposit — ' || new.deposit_method,coalesce(new.reviewed_by,auth.uid()))
   on conflict (source_deposit_id) where entry_type='deposit_credit' do nothing;
 end if;
 return new;
end; $$;
drop trigger if exists wallet_credit_verified_deposit on public.cash_deposit_submissions;
create trigger wallet_credit_verified_deposit after update of status on public.cash_deposit_submissions
 for each row execute function public.credit_verified_deposit_to_wallet();

-- Staff-only debit. Locks the customer's ledger balance and transfer row; duplicate debits are rejected.
create or replace function public.staff_debit_customer_wallet(p_transfer_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_transfer public.transfers%rowtype; v_balance numeric(12,2);
begin
 if not public.is_active_dirhamlink_team_member() then raise exception 'Authorised DirhamLink team access required'; end if;
 select * into v_transfer from public.transfers where id=p_transfer_id for update;
 if not found then raise exception 'Transfer not found'; end if;
 if v_transfer.status in ('cancelled','rejected','payout_confirmed') then raise exception 'Transfer is not eligible for wallet debit'; end if;
 if exists(select 1 from public.wallet_ledger where transfer_id=p_transfer_id and entry_type='transfer_debit') then
   raise exception 'This transfer has already been debited from the wallet';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_transfer.customer_id::text,0));
 select coalesce(sum(case when entry_type in ('deposit_credit','refund_credit','adjustment_credit') then amount_aed else -amount_aed end),0)
 into v_balance from public.wallet_ledger where customer_id=v_transfer.customer_id;
 if v_balance < v_transfer.send_amount_aed then raise exception 'Insufficient verified wallet balance'; end if;
 insert into public.wallet_ledger(customer_id,entry_type,amount_aed,transfer_id,description,created_by)
 values(v_transfer.customer_id,'transfer_debit',v_transfer.send_amount_aed,p_transfer_id,
   'Transfer debit — ' || v_transfer.transaction_reference,auth.uid());
end; $$;
revoke all on function public.staff_debit_customer_wallet(uuid) from public;
grant execute on function public.staff_debit_customer_wallet(uuid) to authenticated;

notify pgrst,'reload schema';
