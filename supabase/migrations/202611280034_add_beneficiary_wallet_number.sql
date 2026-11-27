alter table public.beneficiaries
  add column if not exists recipient_wallet_number text;

comment on column public.beneficiaries.recipient_wallet_number is
  'Recipient mobile wallet identifier supplied for a saved payout preference; not independently verified.';
