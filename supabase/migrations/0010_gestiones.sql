CREATE TYPE gestion_type AS ENUM (
  'llamada_realizada',
  'whatsapp_enviado',
  'email_enviado',
  'reunion_agendada',
  'cliente_pidio_esperar',
  'no_contesto'
);

CREATE TABLE gestiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kam_id uuid NOT NULL REFERENCES kams(id) ON DELETE CASCADE,
  type gestion_type NOT NULL,
  notes text,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  recontact_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON gestiones(company_id, recontact_date);
CREATE INDEX ON gestiones(company_id, created_at DESC);

ALTER TABLE gestiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY gestiones_select_own ON gestiones
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE kam_id = current_kam_id()
    )
  );

CREATE POLICY gestiones_insert_own ON gestiones
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE kam_id = current_kam_id()
    )
    AND kam_id = current_kam_id()
  );
