ALTER TABLE public.patients ALTER COLUMN salutation DROP NOT NULL;
UPDATE public.patients SET salutation = NULL WHERE salutation = '';