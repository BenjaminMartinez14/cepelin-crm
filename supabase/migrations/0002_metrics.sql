-- Computed fields, single source of truth. security_invoker = true makes the
-- view honor the querying user's RLS on the underlying tables (Postgres 15+).
--
-- "Assigned to Cepelin" has two intents:
--   * Active exposure (credit_used, sow, days_since_last_op):
--       status IN (assigned_cepelin, in_collection)
--   * Processed volume (volume_60d, monthly chart): also includes 'collected',
--       since collected invoices represent real volume Cepelin handled.

create view company_metrics with (security_invoker = true) as
select
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
  coalesce(m.credit_used, 0)               as credit_used,
  c.credit_limit - coalesce(m.credit_used, 0) as credit_available,
  m.days_since_last_op,
  coalesce(m.volume_60d, 0)                as volume_60d,
  m.sow_percentage
from companies c
left join lateral (
  select
    sum(i.amount) filter (
      where i.status in ('assigned_cepelin', 'in_collection')
    ) as credit_used,
    (current_date - max(i.issued_at) filter (
      where i.status in ('assigned_cepelin', 'in_collection')
    ))::int as days_since_last_op,
    sum(i.amount) filter (
      where i.status in ('assigned_cepelin', 'in_collection', 'collected')
        and i.issued_at >= current_date - interval '60 days'
    ) as volume_60d,
    round(
      100.0 * coalesce(sum(i.amount) filter (
        where i.status in ('assigned_cepelin', 'in_collection')
      ), 0)
      / nullif(sum(i.amount) filter (
        where i.status in ('assigned_cepelin', 'in_collection', 'assigned_competitor')
      ), 0),
      1
    ) as sow_percentage
  from invoices i
  where i.company_id = c.id
) m on true;
