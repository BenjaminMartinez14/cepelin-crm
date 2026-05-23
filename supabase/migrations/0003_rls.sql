-- Row Level Security: a KAM sees only their own portfolio.
-- Ownership is keyed on the authenticated user's email matching kams.email.

-- Returns the kam id for the current authenticated user. SECURITY DEFINER so it
-- can read kams regardless of RLS; STABLE so the planner can cache it per query.
create or replace function current_kam_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from kams where email = (auth.jwt() ->> 'email')
$$;

alter table kams      enable row level security;
alter table companies enable row level security;
alter table contacts  enable row level security;
alter table debtors   enable row level security;
alter table invoices  enable row level security;
alter table notes     enable row level security;

-- kams: a user can read only their own row.
create policy kams_select_self on kams
  for select to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- companies: full read + followup updates limited to the owning KAM.
create policy companies_select_own on companies
  for select to authenticated
  using (kam_id = current_kam_id());

create policy companies_update_own on companies
  for update to authenticated
  using (kam_id = current_kam_id())
  with check (kam_id = current_kam_id());

-- contacts / invoices: readable when the parent company belongs to the KAM.
create policy contacts_select_own on contacts
  for select to authenticated
  using (exists (
    select 1 from companies c
    where c.id = contacts.company_id and c.kam_id = current_kam_id()
  ));

create policy invoices_select_own on invoices
  for select to authenticated
  using (exists (
    select 1 from companies c
    where c.id = invoices.company_id and c.kam_id = current_kam_id()
  ));

-- debtors: shared reference data, readable by any authenticated user.
create policy debtors_select_all on debtors
  for select to authenticated
  using (true);

-- notes: read + insert scoped to the owning KAM.
create policy notes_select_own on notes
  for select to authenticated
  using (exists (
    select 1 from companies c
    where c.id = notes.company_id and c.kam_id = current_kam_id()
  ));

create policy notes_insert_own on notes
  for insert to authenticated
  with check (
    kam_id = current_kam_id()
    and exists (
      select 1 from companies c
      where c.id = notes.company_id and c.kam_id = current_kam_id()
    )
  );
