-- 0009_fix_provision.sql
-- Fixes provision_demo_kam() to copy key_insight when cloning demo companies.
-- key_insight was added in 0008 but the function was last updated in 0007.

BEGIN;

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
      sector, interaction_summary, news_context, whatsapp_summary,
      key_insight
      -- management_status defaults to 'por_gestionar' via column default
    )
    VALUES (
      v_kam_id, c.name, v_new_tax_id, c.country, c.status,
      c.enrolled_at, c.credit_limit, c.next_followup_date, false,
      c.credit_risk_score,
      c.sector, c.interaction_summary, c.news_context, c.whatsapp_summary,
      c.key_insight
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

COMMIT;
