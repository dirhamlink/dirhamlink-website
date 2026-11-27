ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS customer_rate numeric(20, 8);

COMMENT ON COLUMN public.transfers.reference_rate IS
'Market reference rate captured when the customer created the transfer; not an executable rate.';

COMMENT ON COLUMN public.transfers.customer_rate IS
'Indicative DirhamLink customer rate displayed at creation; final rate requires staff confirmation.';
