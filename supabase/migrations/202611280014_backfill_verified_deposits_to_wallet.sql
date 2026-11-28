-- Backfill deposits already marked verified before the wallet trigger was installed.
-- The unique partial index makes this safe to run more than once.
insert into public.wallet_ledger(customer_id,entry_type,amount_aed,source_deposit_id,description,created_by,created_at)
select d.customer_id,'deposit_credit',d.amount_aed,d.id,
       'Previously verified deposit — ' || d.deposit_method,
       d.reviewed_by,d.coalesce_created_at
from (
 select id,customer_id,amount_aed,deposit_method,reviewed_by,created_at as coalesce_created_at
 from public.cash_deposit_submissions
 where status='verified'
) d
on conflict (source_deposit_id) where entry_type='deposit_credit' do nothing;
notify pgrst,'reload schema';
