
ALTER TABLE public.messages_log
  ADD COLUMN IF NOT EXISTS parts smallint NOT NULL DEFAULT 1 CHECK (parts BETWEEN 1 AND 10);

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS sms_price_net_gr integer NOT NULL DEFAULT 10 CHECK (sms_price_net_gr >= 0);

CREATE OR REPLACE FUNCTION public.get_sms_monthly_stats(_months integer DEFAULT 12)
RETURNS TABLE(month date, messages_count bigint, parts_total bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := GREATEST(COALESCE(_months, 12), 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'therapist'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT (date_trunc('month', (now() AT TIME ZONE 'Europe/Warsaw'))::date
            - (make_interval(months => gs)))::date AS month
    FROM generate_series(0, n - 1) AS gs
  ),
  agg AS (
    SELECT
      date_trunc('month', (COALESCE(sent_at, created_at) AT TIME ZONE 'Europe/Warsaw'))::date AS month,
      COUNT(*)::bigint AS messages_count,
      COALESCE(SUM(parts), 0)::bigint AS parts_total
    FROM public.messages_log
    WHERE status IN ('sent','delivered','undelivered')
    GROUP BY 1
  )
  SELECT m.month,
         COALESCE(a.messages_count, 0)::bigint,
         COALESCE(a.parts_total, 0)::bigint
  FROM months m
  LEFT JOIN agg a ON a.month = m.month
  ORDER BY m.month DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sms_monthly_stats(integer) TO authenticated;
