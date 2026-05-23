-- Auto-provision on first sign-in. Called from the OAuth callback via RPC.
-- If the signed-in email has no KAM, create one and clone the demo portfolio
-- (companies flagged is_demo + their contacts/invoices/notes) so any evaluator
-- sees data immediately. Idempotent: returns the existing kam id on repeat calls.
--
-- Reads the email from the request JWT (not a parameter), so a user can only
-- ever provision their own account.

create or replace function provision_demo_kam()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email       text := auth.jwt() ->> 'email';
  v_kam_id      uuid;
  v_suffix      text;
  c             record;
  v_new_company uuid;
begin
  if v_email is null then
    raise exception 'No authenticated email in request';
  end if;

  select id into v_kam_id from kams where email = v_email;
  if v_kam_id is not null then
    return v_kam_id;  -- already provisioned
  end if;

  insert into kams (name, email)
  values (initcap(split_part(v_email, '@', 1)), v_email)
  returning id into v_kam_id;

  -- Keep cloned tax_ids unique per provisioned evaluator.
  v_suffix := left(replace(v_kam_id::text, '-', ''), 6);

  for c in select * from companies where is_demo loop
    insert into companies (
      kam_id, name, tax_id, country, status,
      enrolled_at, credit_limit, next_followup_date, is_demo
    )
    values (
      v_kam_id, c.name, c.tax_id || '-' || v_suffix, c.country, c.status,
      c.enrolled_at, c.credit_limit, c.next_followup_date, false
    )
    returning id into v_new_company;

    insert into contacts (company_id, name, phone, email)
    select v_new_company, name, phone, email
    from contacts where company_id = c.id;

    -- debtors are shared reference data; reuse debtor_id as-is.
    insert into invoices (company_id, debtor_id, amount, issued_at, status)
    select v_new_company, debtor_id, amount, issued_at, status
    from invoices where company_id = c.id;

    insert into notes (company_id, kam_id, content, created_at)
    select v_new_company, v_kam_id, content, created_at
    from notes where company_id = c.id;
  end loop;

  return v_kam_id;
end;
$$;

grant execute on function provision_demo_kam() to authenticated;
