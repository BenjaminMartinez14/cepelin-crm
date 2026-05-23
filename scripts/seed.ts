/**
 * Seed script. Run with: pnpm seed
 *
 * Generates a realistic KAM portfolio that tells stories (churn risk, low SOW,
 * healthy growth, enrolled-never-activated). Uses the service-role client, so it
 * bypasses RLS. Requires SUPABASE_SERVICE_ROLE_KEY and SEED_KAM_EMAIL.
 *
 * Set SEED_RESET=true to wipe and reseed.
 */
import { createAdminClient } from "../lib/supabase/admin";
import type { Country, CompanyStatus, InvoiceStatus } from "../types";

const db = createAdminClient();

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();

function daysAgo(n: number): string {
  return new Date(today.getTime() - n * DAY).toISOString().slice(0, 10);
}

function rint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rint(0, arr.length - 1)];
}

// --- tax id generators ----------------------------------------------------
function makeRut(): string {
  return `${rint(60, 99)}.${rint(100, 999)}.${rint(100, 999)}-${rint(0, 9)}`;
}
function makeRfc(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l = () => letters[rint(0, 25)];
  return `${l()}${l()}${l()}${rint(100000, 999999)}${l()}${rint(0, 9)}${l()}`;
}
function makeTaxId(country: Country): string {
  return country === "CL" ? makeRut() : makeRfc();
}

// --- cohorts --------------------------------------------------------------
type Cohort = "churn_risk" | "low_sow" | "healthy" | "never_activated";

const CREDIT_RISK: Record<Cohort, [number, number]> = {
  healthy:          [5,  25],
  low_sow:          [25, 50],
  churn_risk:       [55, 85],
  never_activated:  [35, 65],
};

interface CompanySpec {
  name: string;
  country: Country;
  status: CompanyStatus;
  cohort: Cohort;
}

// 15 companies, mixed CL/MX, distributed across two KAMs (8 + 7).
const KAM_A_COMPANIES: CompanySpec[] = [
  { name: "Constructora Andes", country: "CL", status: "recurring", cohort: "healthy" },
  { name: "Textiles del Maipo", country: "CL", status: "active", cohort: "low_sow" },
  { name: "Frutícola Bío Bío", country: "CL", status: "recurring", cohort: "churn_risk" },
  { name: "Logística Pacífico", country: "CL", status: "active", cohort: "healthy" },
  { name: "Aceros Monterrey", country: "MX", status: "recurring", cohort: "low_sow" },
  { name: "Alimentos del Golfo", country: "MX", status: "active", cohort: "churn_risk" },
  { name: "Plásticos Querétaro", country: "MX", status: "enrolled", cohort: "never_activated" },
  { name: "Viña Santa Elena", country: "CL", status: "enrolled", cohort: "never_activated" },
];

const KAM_B_COMPANIES: CompanySpec[] = [
  { name: "Maderas Patagonia", country: "CL", status: "recurring", cohort: "healthy" },
  { name: "Servicios Mineros Norte", country: "CL", status: "active", cohort: "churn_risk" },
  { name: "Comercial Valparaíso", country: "CL", status: "active", cohort: "low_sow" },
  { name: "Electrónica Guadalajara", country: "MX", status: "recurring", cohort: "healthy" },
  { name: "Transportes Yucatán", country: "MX", status: "active", cohort: "low_sow" },
  { name: "Café Veracruz", country: "MX", status: "enrolled", cohort: "never_activated" },
  { name: "Agroindustria Curicó", country: "CL", status: "recurring", cohort: "churn_risk" },
];

const DEBTOR_NAMES = [
  "Cencosud S.A.",
  "Falabella Retail",
  "Walmart México",
  "Cemex Operaciones",
  "Codelco",
  "Grupo Bimbo",
  "Empresas CMPC",
  "FEMSA Comercio",
  "Sodimac",
  "Liverpool",
  "Antofagasta Minerals",
  "Arca Continental",
];

// Build the invoice set for a company based on its story cohort.
function buildInvoices(cohort: Cohort): Array<{
  amount: number;
  issued_at: string;
  status: InvoiceStatus;
}> {
  const out: Array<{ amount: number; issued_at: string; status: InvoiceStatus }> = [];
  const amt = () => rint(8, 60) * 1_000_000; // CLP-scale amounts

  switch (cohort) {
    case "healthy": {
      // Recent, frequent Cepelin volume across the last ~5 months. High SOW.
      for (let i = 0; i < rint(6, 8); i++) {
        const day = rint(2, 150);
        out.push({
          amount: amt(),
          issued_at: daysAgo(day),
          status: pick<InvoiceStatus>([
            "assigned_cepelin",
            "assigned_cepelin",
            "in_collection",
            "collected",
          ]),
        });
      }
      break;
    }
    case "low_sow": {
      // Real volume exists but mostly goes to the competitor.
      // Guarantee ≥1 recent Cepelin invoice so volume_60d > 0.
      out.push({ amount: amt(), issued_at: daysAgo(rint(2, 45)), status: "assigned_cepelin" });
      for (let i = 0; i < rint(4, 7); i++) {
        out.push({
          amount: amt(),
          issued_at: daysAgo(rint(2, 120)),
          status: pick<InvoiceStatus>([
            "assigned_competitor",
            "assigned_competitor",
            "assigned_competitor",
          ]),
        });
      }
      break;
    }
    case "churn_risk": {
      // Was active, but nothing assigned to Cepelin in 30+ days.
      for (let i = 0; i < rint(3, 5); i++) {
        out.push({
          amount: amt(),
          issued_at: daysAgo(rint(35, 160)),
          status: pick<InvoiceStatus>(["assigned_cepelin", "in_collection", "collected"]),
        });
      }
      // A couple of recent invoices that did NOT come to Cepelin.
      for (let i = 0; i < rint(1, 2); i++) {
        out.push({
          amount: amt(),
          issued_at: daysAgo(rint(2, 20)),
          status: pick<InvoiceStatus>(["assigned_competitor", "issued"]),
        });
      }
      break;
    }
    case "never_activated": {
      // Enrolled but never operated with Cepelin. Maybe a couple of issued docs.
      for (let i = 0; i < rint(0, 2); i++) {
        out.push({ amount: amt(), issued_at: daysAgo(rint(5, 40)), status: "issued" });
      }
      break;
    }
  }
  return out;
}

function buildNotes(cohort: Cohort): string[] {
  const base: Record<Cohort, string[]> = {
    healthy: [
      "Cliente muy activo, evaluar aumento de línea con Riesgo.",
      "Interesado en adelantar facturas de su principal pagador.",
    ],
    low_sow: [
      "Gran parte del volumen se va a la competencia. Trabajar propuesta de tasa.",
      "Reunión agendada para revisar condiciones vs. competidor.",
    ],
    churn_risk: [
      "Sin operaciones recientes con Cepelin. Llamar esta semana.",
      "Cliente mencionó problemas de flujo. Riesgo de fuga.",
    ],
    never_activated: [
      "Enrolado pero aún sin primera operación. Coordinar onboarding.",
    ],
  };
  const pool = base[cohort];
  const count = rint(1, Math.min(3, pool.length + 1));
  return pool.slice(0, count);
}

async function reset() {
  // FK-safe order.
  for (const table of ["notes", "invoices", "contacts", "companies", "debtors", "kams"]) {
    const { error } = await db.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`reset ${table}: ${error.message}`);
  }
  console.log("Reset complete.");
}

async function main() {
  const seedEmail = process.env.SEED_KAM_EMAIL;
  if (!seedEmail) throw new Error("SEED_KAM_EMAIL is required");

  if (process.env.SEED_RESET === "true") {
    await reset();
  } else {
    const { count } = await db.from("kams").select("id", { count: "exact", head: true });
    if (count && count > 0) {
      console.log("Data already present. Set SEED_RESET=true to wipe and reseed.");
      return;
    }
  }

  // KAMs — the first uses the configurable evaluator email and owns the demo set.
  const { data: kams, error: kamErr } = await db
    .from("kams")
    .insert([
      { name: "Evaluador Cepelin", email: seedEmail },
      { name: "María González", email: "maria.gonzalez@cepelin.test" },
    ])
    .select();
  if (kamErr || !kams) throw new Error(`kams: ${kamErr?.message}`);
  const [kamA, kamB] = kams;

  // Debtors (shared reference pool).
  const { data: debtors, error: debErr } = await db
    .from("debtors")
    .insert(DEBTOR_NAMES.map((name) => ({ name, tax_id: makeRut() })))
    .select();
  if (debErr || !debtors) throw new Error(`debtors: ${debErr?.message}`);

  const groups: Array<{ kamId: string; isDemo: boolean; specs: CompanySpec[] }> = [
    { kamId: kamA.id, isDemo: true, specs: KAM_A_COMPANIES },
    { kamId: kamB.id, isDemo: false, specs: KAM_B_COMPANIES },
  ];

  let companyCount = 0;
  for (const group of groups) {
    for (const spec of group.specs) {
      const invoiceSpecs = buildInvoices(spec.cohort);

      // credit_limit = avg monthly Cepelin-processed volume * 1.5 (>= a floor).
      const xepVolume = invoiceSpecs
        .filter((i) => ["assigned_cepelin", "in_collection", "collected"].includes(i.status))
        .reduce((s, i) => s + i.amount, 0);
      const avgMonthly = xepVolume / 6;
      const creditLimit = Math.max(Math.round(avgMonthly * 1.5), 20_000_000);

      const { data: company, error: cErr } = await db
        .from("companies")
        .insert({
          kam_id: group.kamId,
          name: spec.name,
          tax_id: makeTaxId(spec.country),
          country: spec.country,
          status: spec.status,
          enrolled_at: daysAgo(rint(40, 400)),
          credit_limit: creditLimit,
          next_followup_date: spec.cohort === "churn_risk" ? daysAgo(-rint(1, 7)) : null,
          is_demo: group.isDemo,
          credit_risk_score: rint(...CREDIT_RISK[spec.cohort]),
        })
        .select()
        .single();
      if (cErr || !company) throw new Error(`company ${spec.name}: ${cErr?.message}`);
      companyCount++;

      // Contacts (1-2).
      const contacts = Array.from({ length: rint(1, 2) }, (_, i) => ({
        company_id: company.id,
        name: `Contacto ${i + 1} ${spec.name.split(" ")[0]}`,
        phone: `+56 9 ${rint(1000, 9999)} ${rint(1000, 9999)}`,
        email: `contacto${i + 1}@${spec.name.split(" ")[0].toLowerCase()}.cl`,
      }));
      const { error: ctErr } = await db.from("contacts").insert(contacts);
      if (ctErr) throw new Error(`contacts ${spec.name}: ${ctErr.message}`);

      // Invoices.
      if (invoiceSpecs.length > 0) {
        const { error: invErr } = await db.from("invoices").insert(
          invoiceSpecs.map((i) => ({
            company_id: company.id,
            debtor_id: pick(debtors).id,
            amount: i.amount,
            issued_at: i.issued_at,
            status: i.status,
          })),
        );
        if (invErr) throw new Error(`invoices ${spec.name}: ${invErr.message}`);
      }

      // Notes.
      const { error: nErr } = await db.from("notes").insert(
        buildNotes(spec.cohort).map((content, idx) => ({
          company_id: company.id,
          kam_id: group.kamId,
          content,
          created_at: new Date(today.getTime() - (idx + 1) * 3 * DAY).toISOString(),
        })),
      );
      if (nErr) throw new Error(`notes ${spec.name}: ${nErr.message}`);
    }
  }

  console.log(
    `Seeded ${kams.length} KAMs, ${debtors.length} debtors, ${companyCount} companies.`,
  );
  console.log(`Evaluator KAM email: ${seedEmail} (owns the demo portfolio).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
