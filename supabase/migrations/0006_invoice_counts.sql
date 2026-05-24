-- Add invoice_status_counts (jsonb) to company_metrics view.
-- Provides a per-status count map so the dashboard can show inline status pills.

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
  coalesce(m.credit_used, 0)                   AS credit_used,
  c.credit_limit - coalesce(m.credit_used, 0)  AS credit_available,
  m.days_since_last_op,
  coalesce(m.volume_60d, 0)                    AS volume_60d,
  m.sow_percentage,
  c.credit_risk_score,
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
      WHERE i.status IN ('assigned_cepelin', 'in_collection')
    ) AS credit_used,
    (current_date - max(i.issued_at) FILTER (
      WHERE i.status IN ('assigned_cepelin', 'in_collection')
    ))::int AS days_since_last_op,
    sum(i.amount) FILTER (
      WHERE i.status IN ('assigned_cepelin', 'in_collection', 'collected')
        AND i.issued_at >= current_date - INTERVAL '60 days'
    ) AS volume_60d,
    round(
      100.0 * coalesce(sum(i.amount) FILTER (
        WHERE i.status IN ('assigned_cepelin', 'in_collection')
      ), 0)
      / nullif(sum(i.amount) FILTER (
        WHERE i.status IN ('assigned_cepelin', 'in_collection', 'assigned_competitor')
      ), 0),
      1
    ) AS sow_percentage
  FROM invoices i
  WHERE i.company_id = c.id
) m ON true;
