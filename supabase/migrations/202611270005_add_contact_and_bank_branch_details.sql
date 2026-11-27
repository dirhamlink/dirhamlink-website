-- Add customer contact and beneficiary branch details to transfer records.
alter table public.transfers
  add column if not exists customer_mobile text,
  add column if not exists recipient_bank_branch text,
  add column if not exists recipient_bank_city text;

comment on column public.transfers.customer_mobile is
'Customer contact number supplied for transfer-related communication.';
comment on column public.transfers.recipient_bank_branch is
'Beneficiary bank branch name.';
comment on column public.transfers.recipient_bank_city is
'Beneficiary bank branch city.';
