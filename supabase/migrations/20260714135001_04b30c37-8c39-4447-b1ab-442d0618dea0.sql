UPDATE public.patients SET salutation = '' WHERE salutation IS NULL;
ALTER TABLE public.patients ALTER COLUMN salutation SET NOT NULL;