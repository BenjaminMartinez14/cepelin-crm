CREATE OR REPLACE FUNCTION provision_demo_kam()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       text := auth.jwt() ->> 'email';
  v_kam_id      uuid;
  v_suffix      text;
  c             record;
  v_new_company uuid;
  v_demo_company uuid;
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

  v_suffix := left(replace(v_kam_id::text, '-', ''), 6);

  FOR c IN SELECT * FROM companies WHERE is_demo LOOP
    v_demo_company := c.id;

    INSERT INTO companies (
      kam_id, name, tax_id, country, status,
      enrolled_at, credit_limit, next_followup_date, is_demo
    )
    VALUES (
      v_kam_id, c.name, c.tax_id || '-' || v_suffix, c.country, c.status,
      c.enrolled_at, c.credit_limit, c.next_followup_date, false
    )
    RETURNING id INTO v_new_company;

    INSERT INTO contacts (company_id, name, phone, email)
    SELECT v_new_company, name, phone, email
    FROM contacts WHERE company_id = v_demo_company;

    INSERT INTO invoices (company_id, debtor_id, amount, issued_at, status)
    SELECT v_new_company, debtor_id, amount, issued_at, status
    FROM invoices WHERE company_id = v_demo_company;

    INSERT INTO notes (company_id, kam_id, content, created_at)
    SELECT v_new_company, v_kam_id, content, created_at
    FROM notes WHERE company_id = v_demo_company;

    INSERT INTO gestiones (company_id, kam_id, type, notes, contacted_at, recontact_date, created_at)
    SELECT v_new_company, v_kam_id, type, notes, contacted_at, recontact_date, created_at
    FROM gestiones WHERE company_id = v_demo_company;
  END LOOP;

  RETURN v_kam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_demo_kam() TO authenticated;
