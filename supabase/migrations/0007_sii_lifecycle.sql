-- ============================================================
-- 0007_sii_lifecycle.sql
-- Introduces Chilean SII invoice lifecycle statuses, new company
-- context columns, and updates all dependent objects accordingly.
-- ============================================================

-- ============================================================
-- STEP 1 — Add new invoice_status enum values
-- IMPORTANT: ALTER TYPE ADD VALUE cannot run inside a transaction
-- block in PostgreSQL. These statements must remain unwrapped so
-- Supabase applies each one as a separate top-level statement.
-- ============================================================

ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'emitida';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'aceptada_sii';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'entregada_receptor';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'acuse_recibo';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'reclamada';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'merito_ejecutivo';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cedida_xepelin';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cedida_competencia';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'en_cobranza';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cobrada';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'protestada';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'vigente';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cancelada';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cedida_mx';

-- ============================================================
-- STEP 2 — Migrate existing invoice data to new SII status names
-- STEP 3 — Add new company columns
-- STEP 4 — Update provision_demo_kam() to copy new columns
-- STEP 5 — Replace company_metrics view
-- (Steps 2-5 are safe inside a transaction)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STEP 2: Migrate old status values → new SII names
-- ------------------------------------------------------------

UPDATE invoices SET status = 'cedida_xepelin'    WHERE status = 'assigned_cepelin';
UPDATE invoices SET status = 'cedida_competencia' WHERE status = 'assigned_competitor';
UPDATE invoices SET status = 'en_cobranza'        WHERE status = 'in_collection';
UPDATE invoices SET status = 'cobrada'            WHERE status = 'collected';
UPDATE invoices SET status = 'emitida'            WHERE status = 'issued';

-- ------------------------------------------------------------
-- STEP 3: Add new company context and management columns
-- ------------------------------------------------------------

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sector               TEXT,
  ADD COLUMN IF NOT EXISTS interaction_summary  TEXT,
  ADD COLUMN IF NOT EXISTS news_context         TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_summary     TEXT,
  ADD COLUMN IF NOT EXISTS management_status    TEXT NOT NULL DEFAULT 'por_gestionar'
    CHECK (management_status IN ('por_gestionar', 'en_seguimiento', 'gestionado', 'en_pausa')),
  ADD COLUMN IF NOT EXISTS management_updated_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- STEP 4: Update provision_demo_kam() to copy new columns
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION provision_demo_kam()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       text := auth.jwt() ->> 'email';
  v_kam_id      uuid;
  c             record;
  v_new_company uuid;
  v_new_tax_id  text;
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated email in request';
  END IF;

  SELECT id INTO v_kam_id FROM kams WHERE email = v_email;
  IF v_kam_id IS NOT NULL THEN
    RETURN v_kam_id;
  END IF;

  INSERT INTO kams (name, email)
  VALUES (initcap(split_part(v_email, '@', 1)), v_email)
  RETURNING id INTO v_kam_id;

  FOR c IN SELECT * FROM companies WHERE is_demo LOOP
    -- Generate a format-valid unique tax_id per country
    v_new_tax_id := CASE c.country
      WHEN 'CL' THEN
        (floor(random()*89+10)::int::text) || '.' ||
        lpad(floor(random()*900+100)::int::text, 3, '0') || '.' ||
        lpad(floor(random()*900+100)::int::text, 3, '0') || '-' ||
        floor(random()*10)::int::text
      ELSE
        chr(65+floor(random()*26)::int) || chr(65+floor(random()*26)::int) ||
        chr(65+floor(random()*26)::int) ||
        lpad(floor(random()*900000+100000)::int::text, 6, '0') ||
        chr(65+floor(random()*26)::int) || floor(random()*10)::int::text ||
        chr(65+floor(random()*26)::int)
    END;

    INSERT INTO companies (
      kam_id, name, tax_id, country, status,
      enrolled_at, credit_limit, next_followup_date, is_demo,
      credit_risk_score,
      sector, interaction_summary, news_context, whatsapp_summary
      -- management_status defaults to 'por_gestionar' via column default
    )
    VALUES (
      v_kam_id, c.name, v_new_tax_id, c.country, c.status,
      c.enrolled_at, c.credit_limit, c.next_followup_date, false,
      c.credit_risk_score,
      c.sector, c.interaction_summary, c.news_context, c.whatsapp_summary
    )
    RETURNING id INTO v_new_company;

    INSERT INTO contacts (company_id, name, phone, email)
    SELECT v_new_company, name, phone, email
    FROM contacts WHERE company_id = c.id;

    -- debtors are shared reference data; reuse debtor_id as-is.
    INSERT INTO invoices (company_id, debtor_id, amount, issued_at, status)
    SELECT v_new_company, debtor_id, amount, issued_at, status
    FROM invoices WHERE company_id = c.id;

    INSERT INTO notes (company_id, kam_id, content, created_at)
    SELECT v_new_company, v_kam_id, content, created_at
    FROM notes WHERE company_id = c.id;
  END LOOP;

  RETURN v_kam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_demo_kam() TO authenticated;

-- ------------------------------------------------------------
-- STEP 5: Replace company_metrics view with updated definition
--   - Status filters use new SII names
--   - Adds new company columns: sector, interaction_summary,
--     news_context, whatsapp_summary, management_status,
--     management_updated_at
--   - Adds computed booleans: has_reclamada, has_stale_entregada
--   - Retains invoice_status_counts jsonb
-- ------------------------------------------------------------

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
  -- New company context columns
  c.sector,
  c.interaction_summary,
  c.news_context,
  c.whatsapp_summary,
  c.management_status,
  c.management_updated_at,
  -- Computed financials (using new SII status names)
  coalesce(m.credit_used, 0)                   AS credit_used,
  c.credit_limit - coalesce(m.credit_used, 0)  AS credit_available,
  m.days_since_last_op,
  coalesce(m.volume_60d, 0)                    AS volume_60d,
  m.sow_percentage,
  -- Alert flags
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
  -- Per-status invoice counts
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
    -- credit_used: active Xepelin-assigned + in-collection invoices
    sum(i.amount) FILTER (
      WHERE i.status IN ('cedida_xepelin', 'en_cobranza')
    ) AS credit_used,
    -- days since last operation (cedida or en_cobranza)
    (current_date - max(i.issued_at) FILTER (
      WHERE i.status IN ('cedida_xepelin', 'en_cobranza')
    ))::int AS days_since_last_op,
    -- 60-day volume: cedida + en_cobranza + cobrada
    sum(i.amount) FILTER (
      WHERE i.status IN ('cedida_xepelin', 'en_cobranza', 'cobrada')
        AND i.issued_at >= current_date - INTERVAL '60 days'
    ) AS volume_60d,
    -- Share of Wallet: Xepelin / (Xepelin + competitor)
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
