-- Expand payout methods while preserving existing customer records.
alter table public.transfers
  drop constraint if exists transfers_payout_method_check;

alter table public.transfers
  add constraint transfers_payout_method_check
  check (payout_method in ('Bank account','Bank transfer','UPI transfer','Cash pickup'));
