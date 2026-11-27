-- Fix funding-method values used by the cash-deposit customer form.
-- The one-step RPC stores the selected UI method verbatim in transfers.funding_method.
alter table public.transfers drop constraint if exists transfers_funding_method_check;
alter table public.transfers add constraint transfers_funding_method_check
 check (funding_method in (
  'Bank CDM deposit',
  'CDM cash deposit',
  'Bank branch cash deposit',
  'Office cash deposit',
  'Cash pickup arrangement'
 ));
