-- One-step cash deposit flow: create a transfer for the customer's saved beneficiary
-- and its pending deposit record atomically. Apply after 202611280002.
alter table public.transfers drop constraint if exists transfers_funding_method_check;
alter table public.transfers add constraint transfers_funding_method_check
 check (funding_method in ('Bank CDM deposit','Bank branch cash deposit','Office cash deposit','Cash pickup arrangement'));

create or replace function public.create_transfer_from_cash_deposit(
 p_beneficiary_id uuid,
 p_amount_aed numeric,
 p_deposit_method text,
 p_deposit_date date,
 p_bank_reference text default null,
 p_receipt_path text default null,
 p_customer_note text default null
) returns table(transfer_id uuid, transaction_reference text, deposit_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
 v_b public.beneficiaries%rowtype;
 v_transfer_id uuid;
 v_reference text;
 v_deposit_id uuid;
 v_currency text;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if p_amount_aed is null or p_amount_aed < 1 or p_amount_aed > 100000 then
   raise exception 'Amount must be between AED 1 and AED 100,000';
 end if;
 if p_deposit_method not in ('CDM cash deposit','Bank branch cash deposit') then
   raise exception 'Unsupported deposit method';
 end if;
 if p_deposit_date is null or p_deposit_date > current_date then
   raise exception 'Enter a valid deposit date';
 end if;
 if p_receipt_path is not null and split_part(p_receipt_path,'/',1) <> auth.uid()::text then
   raise exception 'Receipt path does not belong to your account';
 end if;

 select * into v_b from public.beneficiaries
  where id = p_beneficiary_id and customer_id = auth.uid();
 if not found then raise exception 'Saved beneficiary not found'; end if;

 v_currency := case v_b.destination_country
  when 'India' then 'INR' when 'Pakistan' then 'PKR' when 'Nepal' then 'NPR'
  when 'Bangladesh' then 'BDT' when 'Egypt' then 'EGP'
  when 'Philippines' then 'PHP' when 'Sri Lanka' then 'LKR'
  else null end;
 if v_currency is null then raise exception 'Unsupported beneficiary destination'; end if;

 insert into public.transfers (
  customer_id,destination_country,destination_currency,send_amount_aed,
  recipient_full_name,recipient_bank_name,recipient_bank_account_name,
  recipient_bank_account_number,recipient_bank_ifsc,recipient_bank_branch,
  recipient_bank_city,recipient_upi_id,payout_method,funding_method,
  customer_note,status
 ) values (
  auth.uid(),v_b.destination_country,v_currency,p_amount_aed,
  v_b.recipient_full_name,v_b.bank_name,v_b.account_name,v_b.account_number,
  v_b.ifsc,v_b.bank_branch,v_b.bank_city,v_b.upi_id,v_b.payout_method,
  p_deposit_method,nullif(trim(coalesce(p_customer_note,'')),''),
  'created'
 ) returning id, transaction_reference into v_transfer_id,v_reference;

 insert into public.cash_deposit_submissions (
  customer_id,transfer_id,amount_aed,deposit_method,deposit_date,
  bank_reference,receipt_path,customer_note,status
 ) values (
  auth.uid(),v_transfer_id,p_amount_aed,p_deposit_method,p_deposit_date,
  nullif(trim(coalesce(p_bank_reference,'')),''),
  p_receipt_path,nullif(trim(coalesce(p_customer_note,'')),''),
  'submitted'
 ) returning id into v_deposit_id;

 return query select v_transfer_id,v_reference,v_deposit_id;
end;
$$;
revoke all on function public.create_transfer_from_cash_deposit(uuid,numeric,text,date,text,text,text) from public;
grant execute on function public.create_transfer_from_cash_deposit(uuid,numeric,text,date,text,text,text) to authenticated;
