ALTER TABLE public.series ADD COLUMN IF NOT EXISTS is_dubbed BOOLEAN DEFAULT false;
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS source_platform TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.series TO authenticated;
GRANT ALL ON public.series TO service_role;
GRANT SELECT ON public.series TO anon;