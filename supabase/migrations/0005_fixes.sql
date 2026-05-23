-- 1. Add credit_risk_score to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS credit_risk_score INTEGER CHECK (credit_risk_score BETWEEN 0 AND 100);

-- 2. Recreate company_metrics view to include credit_risk_score
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
  c.credit_risk_score
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

-- 3. Fix provision_demo_kam() to generate proper-format tax IDs
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
      credit_risk_score
    )
    VALUES (
      v_kam_id, c.name, v_new_tax_id, c.country, c.status,
      c.enrolled_at, c.credit_limit, c.next_followup_date, false,
      c.credit_risk_score
    )
    RETURNING id INTO v_new_company;

    INSERT INTO contacts (company_id, name, phone, email)
    SELECT v_new_company, name, phone, email
    FROM contacts WHERE company_id = c.id;

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

-- 4. Delete cloned companies with bad tax_ids (suffix like -090063).
-- Contacts, invoices, and notes cascade-delete automatically.
-- User re-provisions by signing out and back in via the fixed function above.
DELETE FROM companies WHERE tax_id ~ '-[0-9a-f]{6}$';
