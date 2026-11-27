alter table public.transfers
  add column if not exists recipient_wallet_number text;

comment on column public.transfers.recipient_wallet_number is
  'Recipient mobile wallet identifier supplied for a payout request; not independently verified.';
