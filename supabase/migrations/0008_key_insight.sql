-- 0008_key_insight.sql
-- Adds key_insight column to companies and updates company_metrics view.

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS key_insight TEXT;

-- Add key_insight to company_metrics view by replacing it
CREATE OR REPLACE VIEW company_metrics WITH (security_invoker = true) AS
SELECT
  c.id,
  c.kam_id,
  c.name,
  c.tax_id,
  c.country,
  c.status,
  c.enrolled_at,
  c.credit_limit,
  c.next_followup_date,
  c.health_score,
  c.churn_risk,
  c.ai_summary,
  c.recommended_actions,
  c.ai_generated_at,
  c.credit_risk_score,
  c.sector,
  c.interaction_summary,
  c.news_context,
  c.whatsapp_summary,
  c.management_status,
  c.management_updated_at,
  c.key_insight,
  coalesce(m.credit_used, 0)                   AS credit_used,
  c.credit_limit - coalesce(m.credit_used, 0)  AS credit_available,
  m.days_since_last_op,
  coalesce(m.volume_60d, 0)                    AS volume_60d,
  m.sow_percentage,
  EXISTS (
    SELECT 1 FROM invoices
    WHERE company_id = c.id AND status = 'reclamada'
  ) AS has_reclamada,
  EXISTS (
    SELECT 1 FROM invoices
    WHERE company_id = c.id
      AND status = 'entregada_receptor'
      AND issued_at <= current_date - INTERVAL '15 days'
  ) AS has_stale_entregada,
  (
    SELECT jsonb_object_agg(sti.status, sti.cnt)
    FROM (
      SELECT status, count(*) AS cnt
      FROM invoices
      WHERE company_id = c.id
      GROUP BY status
    ) sti
  ) AS invoice_status_counts
FROM companies c
LEFT JOIN LATERAL (
  SELECT
    sum(i.amount) FILTER (
      WHERE i.status IN ('cedida_xepelin', 'en_cobranza')
    ) AS credit_used,
    (current_date - max(i.issued_at) FILTER (
      WHERE i.status IN ('cedida_xepelin', 'en_cobranza')
    ))::int AS days_since_last_op,
    sum(i.amount) FILTER (
      WHERE i.status IN ('cedida_xepelin', 'en_cobranza', 'cobrada')
        AND i.issued_at >= current_date - INTERVAL '60 days'
    ) AS volume_60d,
    round(
      100.0 * coalesce(sum(i.amount) FILTER (
        WHERE i.status IN ('cedida_xepelin', 'en_cobranza')
      ), 0)
      / nullif(sum(i.amount) FILTER (
        WHERE i.status IN ('cedida_xepelin', 'en_cobranza', 'cedida_competencia')
      ), 0),
      1
    ) AS sow_percentage
  FROM invoices i
  WHERE i.company_id = c.id
) m ON true;

COMMIT;
