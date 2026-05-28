/**
 * Seed script — full SII/SAT lifecycle + qualitative fields.
 * Run with: pnpm seed
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, SEED_KAM_EMAIL
 * Set SEED_RESET=true to wipe and reseed.
 *
 * Company status is derived automatically from invoice history:
 *   0 cedida_xepelin/cedida_mx in last 90 days → enrolled
 *   1-2  → active
 *   3+   → recurring
 */
import { createAdminClient } from "../lib/supabase/admin";
import type { Country, CompanyStatus, InvoiceStatus } from "../types";

const db = createAdminClient();
const DAY = 24 * 60 * 60 * 1000;
const today = new Date();

function daysAgo(n: number): string {
  return new Date(today.getTime() - n * DAY).toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  return new Date(today.getTime() + n * DAY).toISOString().slice(0, 10);
}

function rint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rint(0, arr.length - 1)];
}

function makeRut(): string {
  return `${rint(60, 99)}.${rint(100, 999)}.${rint(100, 999)}-${rint(0, 9)}`;
}

function makeRfc(): string {
  const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r = () => l[rint(0, 25)];
  return `${r()}${r()}${r()}${rint(100000, 999999)}${r()}${rint(0, 9)}${r()}`;
}

function makeTaxId(country: Country): string {
  return country === "CL" ? makeRut() : makeRfc();
}

function computeStatus(invoices: InvoiceSpec[]): CompanyStatus {
  const cutoff = daysAgo(90);
  const cedidaCount = invoices.filter(
    (inv) =>
      (inv.status === "cedida_xepelin" || inv.status === "cedida_mx") &&
      inv.issued_at >= cutoff,
  ).length;
  if (cedidaCount === 0) return "enrolled";
  if (cedidaCount <= 2) return "active";
  return "recurring";
}

// Named debtors for realistic stories
const DEBTOR_NAMES = [
  "Cencosud S.A.",
  "Falabella Retail S.A.",
  "Walmart Chile",
  "Codelco",
  "Empresas CMPC",
  "Sodimac",
  "Antofagasta Minerals",
  "FEMSA Comercio",
  "Walmart México",
  "Cemex Operaciones",
  "Grupo Bimbo",
  "Arca Continental",
];

interface InvoiceSpec {
  debtor: string; // must match a name in DEBTOR_NAMES
  amount: number;
  issued_at: string;
  status: InvoiceStatus;
}

interface CompanySpec {
  name: string;
  country: Country;
  credit_risk_score: number;
  credit_limit: number;
  enrolled_at: string;
  next_followup_date: string | null;
  sector: string;
  interaction_summary: string | null;
  news_context: string | null;
  whatsapp_summary: string | null;
  invoices: InvoiceSpec[];
  notes: string[];
}

const DEMO_COMPANIES: CompanySpec[] = [
  // ── CL: Churn Risk ────────────────────────────────────────────────────────
  {
    name: "Constructora Andes Ltda.",
    country: "CL",
    credit_risk_score: 62,
    credit_limit: 120_000_000,
    enrolled_at: daysAgo(280),
    next_followup_date: daysAgo(2), // overdue → 🔴
    sector: "Construcción",
    interaction_summary:
      "Reunión presencial el 8 de mayo. Cliente espera acuse de Falabella para ceder. Mencionó que Cencosud está demorando pagos en general.",
    news_context:
      "Falabella reportó caída de 12% en compras a proveedores de construcción en Q1 2026. Puede afectar el timing del acuse de recibo.",
    whatsapp_summary:
      "Último mensaje hace 18 días. Cliente prometió gestionar el acuse con Falabella pero no hay respuesta. 2 mensajes sin leer.",
    invoices: [
      // 1 historical cedida_xepelin → active
      { debtor: "Walmart Chile",         amount: 27_000_000, issued_at: daysAgo(55), status: "cedida_xepelin" },
      // Ready to assign
      { debtor: "Falabella Retail S.A.", amount: 34_000_000, issued_at: daysAgo(25), status: "acuse_recibo" },
      { debtor: "Cencosud S.A.",         amount: 28_000_000, issued_at: daysAgo(22), status: "entregada_receptor" },
      { debtor: "Sodimac",               amount: 19_000_000, issued_at: daysAgo(21), status: "entregada_receptor" },
      { debtor: "Walmart Chile",         amount: 22_000_000, issued_at: daysAgo(31), status: "entregada_receptor" },
      // Went to competitors / historical
      { debtor: "Cencosud S.A.",         amount: 41_000_000, issued_at: daysAgo(100), status: "cedida_competencia" },
      { debtor: "Falabella Retail S.A.", amount: 30_000_000, issued_at: daysAgo(130), status: "cedida_competencia" },
      { debtor: "Codelco",               amount: 55_000_000, issued_at: daysAgo(200), status: "cobrada" },
    ],
    notes: [
      "Falabella sigue sin dar acuse de recibo en 3 facturas. Riesgo de que superen los 8 días y pierdan mérito ejecutivo.",
      "Cliente tiene volumen interesante pero la competencia se llevó 2 facturas grandes en enero.",
    ],
  },

  {
    name: "Textil Sudamericana Ltda.",
    country: "CL",
    credit_risk_score: 71,
    credit_limit: 80_000_000,
    enrolled_at: daysAgo(340),
    next_followup_date: daysAgo(1), // overdue → 🔴
    sector: "Textil y confección",
    interaction_summary:
      "KAM llamó el 8 de mayo. Cliente mencionó que Cencosud reclamó la factura por error en la descripción del servicio. Está tramitando nota de crédito.",
    news_context:
      "Sector textil CL con baja demanda en Q1 2026. Cencosud redujo inventarios. Riesgo de que el cliente no retome volumen pronto.",
    whatsapp_summary:
      "Sin respuesta desde el 10 de mayo. 3 mensajes sin leer. Última operación fue hace 45 días.",
    invoices: [
      // 1 historical cedida_xepelin (before current dispute) → active
      { debtor: "Walmart Chile",         amount: 18_000_000, issued_at: daysAgo(75), status: "cedida_xepelin" },
      // Current dispute
      { debtor: "Cencosud S.A.",         amount: 38_000_000, issued_at: daysAgo(45), status: "reclamada" },
      // New emitida ready to assign once dispute resolves
      { debtor: "Sodimac",               amount: 12_000_000, issued_at: daysAgo(5),  status: "emitida" },
      // Historical paid invoices
      { debtor: "Falabella Retail S.A.", amount: 22_000_000, issued_at: daysAgo(120), status: "cobrada" },
      { debtor: "Walmart Chile",         amount: 18_000_000, issued_at: daysAgo(180), status: "cobrada" },
      { debtor: "Sodimac",               amount: 15_000_000, issued_at: daysAgo(240), status: "cobrada" },
    ],
    notes: [
      "Factura reclamada por Cencosud — error en descripción. Cliente tramitando NC. Urgente resolver antes del cierre de mes.",
      "45 días sin nuevas operaciones. Alta probabilidad de fuga si no actuamos esta semana.",
    ],
  },

  {
    name: "Grupo Industrial Magallanes S.A.",
    country: "CL",
    credit_risk_score: 78,
    credit_limit: 200_000_000,
    enrolled_at: daysAgo(500),
    next_followup_date: null,
    sector: "Industria pesada",
    interaction_summary:
      "Último contacto fue hace 60 días. Cliente dejó de responder después de que se inició proceso judicial por factura de Codelco.",
    news_context:
      "Codelco anunció revisión de contratos con proveedores en la región de Magallanes. Puede afectar la liquidez del cliente.",
    whatsapp_summary:
      "Sin respuesta desde hace 2 meses. Número de contacto activo pero no responde.",
    invoices: [
      // 3 cedida_xepelin from when they were still active (before the 60-day silence) → recurring
      { debtor: "Codelco",               amount: 78_000_000, issued_at: daysAgo(70), status: "cedida_xepelin" },
      { debtor: "Antofagasta Minerals",  amount: 52_000_000, issued_at: daysAgo(80), status: "cedida_xepelin" },
      { debtor: "Codelco",               amount: 63_000_000, issued_at: daysAgo(88), status: "cedida_xepelin" },
      // Current crisis
      { debtor: "Codelco",               amount: 95_000_000, issued_at: daysAgo(75), status: "protestada" },
      // Older history
      { debtor: "Antofagasta Minerals",  amount: 60_000_000, issued_at: daysAgo(200), status: "cobrada" },
      { debtor: "Codelco",               amount: 45_000_000, issued_at: daysAgo(300), status: "cobrada" },
    ],
    notes: [
      "Factura de Codelco en proceso judicial. Esperar resolución legal antes de nuevas operaciones.",
      "Cliente era recurrente pero 60 días sin actividad. Riesgo de perder la relación permanentemente.",
    ],
  },

  // ── CL: Healthy ───────────────────────────────────────────────────────────
  {
    name: "Sociedad Agrícola del Norte S.A.",
    country: "CL",
    credit_risk_score: 18,
    credit_limit: 150_000_000,
    enrolled_at: daysAgo(600),
    next_followup_date: daysFromNow(3), // upcoming this week → 🟡
    sector: "Agroindustria",
    interaction_summary:
      "Reunión mensual de revisión de portafolio el 20 de mayo. Cliente satisfecho con tasas. Evaluar aumento de línea.",
    news_context:
      "Buena temporada de exportaciones de fruta CL. El cliente tiene contratos nuevos con Walmart Chile para Q3.",
    whatsapp_summary:
      "Contacto fluido. Última confirmación de operación vía WhatsApp hace 5 días.",
    invoices: [
      // 3 cedida_xepelin in 90 days → recurring ✓
      { debtor: "Walmart Chile",         amount: 42_000_000, issued_at: daysAgo(10), status: "cedida_xepelin" },
      { debtor: "Cencosud S.A.",         amount: 38_000_000, issued_at: daysAgo(20), status: "cedida_xepelin" },
      { debtor: "Sodimac",               amount: 31_000_000, issued_at: daysAgo(35), status: "cedida_xepelin" },
      { debtor: "Falabella Retail S.A.", amount: 29_000_000, issued_at: daysAgo(55), status: "en_cobranza" },
      { debtor: "Walmart Chile",         amount: 44_000_000, issued_at: daysAgo(90), status: "cobrada" },
      { debtor: "Cencosud S.A.",         amount: 36_000_000, issued_at: daysAgo(130), status: "cobrada" },
    ],
    notes: [
      "Excelente cliente. Evaluar propuesta de aumento de línea para la temporada de exportaciones.",
      "SOW de Xepelin al 100%. Ningún volumen a competencia en el último año.",
    ],
  },

  {
    name: "Minera Atacama SpA",
    country: "CL",
    credit_risk_score: 12,
    credit_limit: 300_000_000,
    enrolled_at: daysAgo(800),
    next_followup_date: daysFromNow(15),
    sector: "Minería",
    interaction_summary:
      "Cliente ancla. Revisión trimestral con gerente de finanzas el 15 de mayo. Expansión de línea aprobada.",
    news_context:
      "Precio del cobre en máximo de 5 años. Minera Atacama con contratos de largo plazo con Codelco. Estabilidad financiera alta.",
    whatsapp_summary:
      "Comunicación semanal con el CFO vía WhatsApp. Última confirmación de operación hace 3 días.",
    invoices: [
      // 3 cedida_xepelin in 90 days → recurring ✓
      { debtor: "Codelco",               amount: 120_000_000, issued_at: daysAgo(8),  status: "cedida_xepelin" },
      { debtor: "Antofagasta Minerals",  amount: 85_000_000,  issued_at: daysAgo(15), status: "cedida_xepelin" },
      { debtor: "Antofagasta Minerals",  amount: 92_000_000,  issued_at: daysAgo(55), status: "cedida_xepelin" },
      { debtor: "Codelco",               amount: 95_000_000,  issued_at: daysAgo(30), status: "en_cobranza" },
      { debtor: "Codelco",               amount: 110_000_000, issued_at: daysAgo(130), status: "cobrada" },
      { debtor: "Antofagasta Minerals",  amount: 78_000_000,  issued_at: daysAgo(160), status: "cobrada" },
    ],
    notes: [
      "Cliente estratégico. No tocar tasa. Prioridad en resolución de cualquier incidencia.",
      "Línea de CLP 300M aprobada. Siguiente visita presencial en agosto.",
    ],
  },

  // ── CL: Low SOW ───────────────────────────────────────────────────────────
  {
    name: "Importadora Tecnológica S.A.",
    country: "CL",
    credit_risk_score: 34,
    credit_limit: 90_000_000,
    enrolled_at: daysAgo(220),
    next_followup_date: daysFromNow(5), // within 7 days → 🟡
    sector: "Tecnología e importación",
    interaction_summary:
      "El cliente cedió el 80% de su volumen a BancoEstado Factoring por mejor tasa. Reunión para revisar propuesta competitiva agendada para la próxima semana.",
    news_context:
      "BancoEstado bajó tasas de factoring un 0.3% en abril. Competencia agresiva en el segmento tech.",
    whatsapp_summary:
      "Contacto activo. Cliente preguntó por tasa el viernes. Esperando propuesta revisada.",
    invoices: [
      // 1 cedida_xepelin → active ✓
      { debtor: "Falabella Retail S.A.", amount: 25_000_000, issued_at: daysAgo(12), status: "cedida_xepelin" },
      // New invoice ready to assign (opportunity to recover SOW)
      { debtor: "Sodimac",               amount: 32_000_000, issued_at: daysAgo(5),  status: "emitida" },
      // Went to competitors
      { debtor: "Cencosud S.A.",         amount: 48_000_000, issued_at: daysAgo(8),  status: "cedida_competencia" },
      { debtor: "Walmart Chile",         amount: 52_000_000, issued_at: daysAgo(20), status: "cedida_competencia" },
      { debtor: "Sodimac",               amount: 38_000_000, issued_at: daysAgo(35), status: "cedida_competencia" },
      { debtor: "Falabella Retail S.A.", amount: 41_000_000, issued_at: daysAgo(50), status: "cedida_competencia" },
      { debtor: "Cencosud S.A.",         amount: 29_000_000, issued_at: daysAgo(65), status: "cedida_competencia" },
    ],
    notes: [
      "SOW de Xepelin solo 17%. Recuperar este cliente es prioridad antes de fin de Q2.",
      "Preparar propuesta de tasa diferenciada para facturas de Falabella y Cencosud.",
    ],
  },

  {
    name: "Alimentos del Sur Ltda.",
    country: "CL",
    credit_risk_score: 28,
    credit_limit: 75_000_000,
    enrolled_at: daysAgo(160),
    next_followup_date: daysFromNow(4),
    sector: "Alimentos y bebidas",
    interaction_summary:
      "Walmart Chile tiene facturas listas para ceder pero el cliente prefirió la competencia la última vez. Hay una de Falabella en acuse de recibo lista para ceder a Xepelin.",
    news_context:
      "Falabella mejoró condiciones de pago a proveedores de alimentos en Q2 2026. Puede facilitar más cesiones.",
    whatsapp_summary:
      "Buena relación personal. Cliente abierto a conversación sobre la factura de Falabella.",
    invoices: [
      // 1 historical cedida_xepelin → active ✓
      { debtor: "Sodimac",               amount: 21_000_000, issued_at: daysAgo(80), status: "cedida_xepelin" },
      // Ready to assign
      { debtor: "Falabella Retail S.A.", amount: 33_000_000, issued_at: daysAgo(9),  status: "acuse_recibo" },
      // Went to competitors
      { debtor: "Walmart Chile",         amount: 44_000_000, issued_at: daysAgo(15), status: "cedida_competencia" },
      { debtor: "Walmart Chile",         amount: 38_000_000, issued_at: daysAgo(30), status: "cedida_competencia" },
      { debtor: "Sodimac",               amount: 17_000_000, issued_at: daysAgo(130), status: "cobrada" },
    ],
    notes: [
      "Factura de Falabella en acuse de recibo — excelente oportunidad para ceder a Xepelin esta semana.",
      "Walmart cedido a la competencia dos veces seguidas. Necesitamos propuesta de valor más clara.",
    ],
  },

  // ── CL: Distribuidora (healthy recurring) ────────────────────────────────
  {
    name: "Distribuidora El Pacífico S.A.",
    country: "CL",
    credit_risk_score: 22,
    credit_limit: 100_000_000,
    enrolled_at: daysAgo(450),
    next_followup_date: daysFromNow(6),
    sector: "Distribución y logística",
    interaction_summary:
      "Cliente con buen ritmo operacional. Hay facturas en mérito ejecutivo listas para proponer a cliente como portafolio limpio.",
    news_context:
      "Crecimiento del retail online impulsa la demanda logística en CL. El cliente tiene nuevos contratos.",
    whatsapp_summary:
      "Cliente responde rápido. Confirmó disponibilidad para reunión la próxima semana.",
    invoices: [
      // 3 cedida_xepelin in 90 days → recurring ✓
      { debtor: "Cencosud S.A.",         amount: 42_000_000, issued_at: daysAgo(25), status: "cedida_xepelin" },
      { debtor: "Walmart Chile",         amount: 31_000_000, issued_at: daysAgo(50), status: "cedida_xepelin" },
      { debtor: "Falabella Retail S.A.", amount: 33_000_000, issued_at: daysAgo(75), status: "cedida_xepelin" },
      // Ready to assign
      { debtor: "Sodimac",               amount: 28_000_000, issued_at: daysAgo(12), status: "merito_ejecutivo" },
      { debtor: "Falabella Retail S.A.", amount: 36_000_000, issued_at: daysAgo(18), status: "merito_ejecutivo" },
      { debtor: "Sodimac",               amount: 39_000_000, issued_at: daysAgo(110), status: "cobrada" },
    ],
    notes: [
      "Facturas de Sodimac y Falabella con mérito ejecutivo — proponer cesión inmediata.",
      "Buen cliente. Explorar producto Pyme Pro en la próxima reunión.",
    ],
  },

  // ── CL: Never Activated ───────────────────────────────────────────────────
  {
    name: "Logística Nacional SpA",
    country: "CL",
    credit_risk_score: 45,
    credit_limit: 50_000_000,
    enrolled_at: daysAgo(90),
    next_followup_date: null,
    sector: "Logística y transporte",
    interaction_summary: null,
    news_context: null,
    whatsapp_summary: "Onboarding completado pero sin primera operación. Número validado.",
    invoices: [
      // Only emitida → 0 cedida_xepelin → enrolled ✓
      { debtor: "Walmart Chile",         amount: 18_000_000, issued_at: daysAgo(15), status: "emitida" },
      { debtor: "Cencosud S.A.",         amount: 24_000_000, issued_at: daysAgo(20), status: "emitida" },
      { debtor: "Falabella Retail S.A.", amount: 12_000_000, issued_at: daysAgo(30), status: "emitida" },
    ],
    notes: [
      "Enrolado hace 90 días. Facturas emitidas pero nunca cedidas. Coordinar primer onboarding operativo.",
    ],
  },

  {
    name: "Empresa de Servicios Técnicos S.A.",
    country: "CL",
    credit_risk_score: 52,
    credit_limit: 40_000_000,
    enrolled_at: daysAgo(45),
    next_followup_date: null,
    sector: "Servicios técnicos y mantención",
    interaction_summary: null,
    news_context: null,
    whatsapp_summary: null,
    invoices: [
      // Only emitida → 0 cedida_xepelin → enrolled ✓
      { debtor: "Cencosud S.A.",         amount: 14_000_000, issued_at: daysAgo(10), status: "emitida" },
      { debtor: "Falabella Retail S.A.", amount: 19_000_000, issued_at: daysAgo(18), status: "emitida" },
      { debtor: "Sodimac",               amount: 11_000_000, issued_at: daysAgo(28), status: "emitida" },
    ],
    notes: [
      "Empresa enrolada recientemente. Tiene 3 facturas emitidas listas para ceder. Coordinar primer onboarding operativo y guiar proceso DTE.",
    ],
  },

  // ── MX: Healthy ───────────────────────────────────────────────────────────
  {
    name: "Walmart México Proveedores S.A. de C.V.",
    country: "MX",
    credit_risk_score: 15,
    credit_limit: 5_000_000,  // MXN scale
    enrolled_at: daysAgo(700),
    next_followup_date: daysFromNow(20),
    sector: "Proveeduría retail",
    interaction_summary:
      "Portafolio estable. Último ciclo de cesión completado sin incidencias. El cliente opera principalmente con CFDI de Walmart.",
    news_context:
      "Walmart México con expansión de tiendas en el centro del país. Más volumen esperado en Q3.",
    whatsapp_summary:
      "Comunicación fluida con el equipo de tesorería. Operan en ciclos mensuales predecibles.",
    invoices: [
      // 3 cedida_mx in 90 days → recurring ✓
      { debtor: "Walmart México",        amount: 850_000,  issued_at: daysAgo(10), status: "cedida_mx" },
      { debtor: "FEMSA Comercio",        amount: 620_000,  issued_at: daysAgo(15), status: "cedida_mx" },
      { debtor: "Walmart México",        amount: 790_000,  issued_at: daysAgo(45), status: "cedida_mx" },
      { debtor: "Walmart México",        amount: 910_000,  issued_at: daysAgo(110), status: "cobrada" },
      { debtor: "FEMSA Comercio",        amount: 540_000,  issued_at: daysAgo(140), status: "cobrada" },
    ],
    notes: [
      "Cliente ancla en MX. Alta estabilidad operacional.",
      "Explorar producto de línea rotativa para el ciclo de Q3.",
    ],
  },

  {
    name: "Alimentos Tropicales S.A. de C.V.",
    country: "MX",
    credit_risk_score: 20,
    credit_limit: 3_000_000,
    enrolled_at: daysAgo(500),
    next_followup_date: daysFromNow(10),
    sector: "Alimentos y bebidas MX",
    interaction_summary:
      "Ciclos mensuales con OXXO y Walmart MX. Muy estable. Cliente pide nueva línea para temporada alta.",
    news_context:
      "Grupo Bimbo y FEMSA con aumentos de compras a proveedores en Q2. Buen momento para proponer aumento de línea.",
    whatsapp_summary:
      "Responde en menos de 2 horas. Muy colaborativo con documentación.",
    invoices: [
      // 3 cedida_mx in 90 days → recurring ✓
      { debtor: "Grupo Bimbo",           amount: 480_000,  issued_at: daysAgo(7),  status: "cedida_mx" },
      { debtor: "FEMSA Comercio",        amount: 530_000,  issued_at: daysAgo(18), status: "cedida_mx" },
      { debtor: "Arca Continental",      amount: 420_000,  issued_at: daysAgo(50), status: "cedida_mx" },
      { debtor: "Walmart México",        amount: 410_000,  issued_at: daysAgo(38), status: "en_cobranza" },
      { debtor: "Grupo Bimbo",           amount: 490_000,  issued_at: daysAgo(110), status: "cobrada" },
      { debtor: "FEMSA Comercio",        amount: 375_000,  issued_at: daysAgo(140), status: "cobrada" },
    ],
    notes: [
      "Proponer aumento de línea a MXN 4.5M para temporada alta Q3.",
    ],
  },

  // ── MX: Low SOW ───────────────────────────────────────────────────────────
  {
    name: "Comercializadora Azteca S.A. de C.V.",
    country: "MX",
    credit_risk_score: 38,
    credit_limit: 2_500_000,
    enrolled_at: daysAgo(180),
    next_followup_date: daysFromNow(4),
    sector: "Comercio y distribución MX",
    interaction_summary:
      "El cliente cedió la mayoría del volumen de FEMSA a otra institución financiera. Solo 1 CFDI cedido a Xepelin MX.",
    news_context:
      "FEMSA lanzó programa de pago a proveedores con descuentos por pronto pago. Puede reducir la necesidad de factoring.",
    whatsapp_summary:
      "Contacto activo. Cliente interesado en comparar tasas de nuevo.",
    invoices: [
      // 1 cedida_mx → active ✓
      { debtor: "Arca Continental",      amount: 320_000,  issued_at: daysAgo(14), status: "cedida_mx" },
      // New CFDI ready to assign (opportunity)
      { debtor: "Arca Continental",      amount: 280_000,  issued_at: daysAgo(5),  status: "vigente" },
      // Went to competitors
      { debtor: "FEMSA Comercio",        amount: 680_000,  issued_at: daysAgo(10), status: "cedida_competencia" },
      { debtor: "FEMSA Comercio",        amount: 520_000,  issued_at: daysAgo(25), status: "cedida_competencia" },
      { debtor: "Walmart México",        amount: 440_000,  issued_at: daysAgo(50), status: "cedida_competencia" },
    ],
    notes: [
      "SOW de Xepelin MX solo 19%. FEMSA va todo a la competencia.",
      "Preparar propuesta comparativa antes de la reunión del viernes.",
    ],
  },

  // ── MX: Churn Risk ────────────────────────────────────────────────────────
  {
    name: "Grupo Cemento del Norte S.A. de C.V.",
    country: "MX",
    credit_risk_score: 65,
    credit_limit: 4_000_000,
    enrolled_at: daysAgo(350),
    next_followup_date: daysAgo(5), // overdue → 🔴
    sector: "Construcción y materiales MX",
    interaction_summary:
      "Sin operaciones en 35 días. El cliente tiene CFDIs vigentes pero no ha contactado a Xepelin para ceder.",
    news_context:
      "Sector construcción MX con contracción de demanda en zona norte. Cemex redujo pedidos a proveedores.",
    whatsapp_summary:
      "Último mensaje hace 3 semanas. Cliente leyó pero no respondió.",
    invoices: [
      // 1 historical cedida_mx before the 35-day silence → active ✓
      { debtor: "Arca Continental",      amount: 450_000,  issued_at: daysAgo(85), status: "cedida_mx" },
      // CFDIs currently sitting — ready to assign but client not engaging
      { debtor: "Cemex Operaciones",     amount: 740_000,  issued_at: daysAgo(36), status: "vigente" },
      { debtor: "Cemex Operaciones",     amount: 680_000,  issued_at: daysAgo(38), status: "vigente" },
      { debtor: "Arca Continental",      amount: 290_000,  issued_at: daysAgo(40), status: "vigente" },
      { debtor: "Cemex Operaciones",     amount: 920_000,  issued_at: daysAgo(200), status: "cobrada" },
    ],
    notes: [
      "3 CFDIs vigentes sin ceder. 35 días sin actividad. Llamar urgente.",
      "Sector construcción en contracción. Analizar riesgo crediticio antes de ampliar línea.",
    ],
  },

  {
    name: "Transportes Pacífico MX S.A. de C.V.",
    country: "MX",
    credit_risk_score: 73,
    credit_limit: 1_800_000,
    enrolled_at: daysAgo(250),
    next_followup_date: daysAgo(3), // overdue → 🔴
    sector: "Transporte y logística MX",
    interaction_summary:
      "Walmart MX canceló 2 CFDIs por disputa de servicio. Cliente en proceso de renegociación de contrato con deudor.",
    news_context:
      "Walmart México implementó nuevos estándares de documentación para proveedores de transporte. Puede causar más cancelaciones.",
    whatsapp_summary:
      "Cliente frustrado. Último mensaje fue queja por la cancelación. Requiere llamada de seguimiento urgente.",
    invoices: [
      // 1 cedida_mx before the cancelation issues → active ✓
      { debtor: "FEMSA Comercio",        amount: 310_000,  issued_at: daysAgo(85), status: "cedida_mx" },
      // Current crisis
      { debtor: "Walmart México",        amount: 420_000,  issued_at: daysAgo(25), status: "cancelada" },
      { debtor: "Walmart México",        amount: 380_000,  issued_at: daysAgo(28), status: "cancelada" },
      // Historical
      { debtor: "FEMSA Comercio",        amount: 290_000,  issued_at: daysAgo(130), status: "cobrada" },
      { debtor: "Walmart México",        amount: 350_000,  issued_at: daysAgo(170), status: "cobrada" },
    ],
    notes: [
      "2 CFDIs cancelados por Walmart MX. El cliente no puede operar hasta resolver la disputa.",
      "Evaluar pausa en la línea hasta que el cliente normalice la relación con su deudor.",
    ],
  },
];

async function reset() {
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

  // KAMs
  const { data: kams, error: kamErr } = await db
    .from("kams")
    .insert([{ name: "Evaluador Demo", email: seedEmail }])
    .select();
  if (kamErr || !kams) throw new Error(`kams: ${kamErr?.message}`);
  const [kamA] = kams;

  // Debtors (shared reference pool)
  const MX_ONLY_DEBTORS = new Set(["Walmart México", "FEMSA Comercio", "Grupo Bimbo", "Arca Continental", "Cemex Operaciones"]);
  const { data: debtors, error: debErr } = await db
    .from("debtors")
    .insert(DEBTOR_NAMES.map((name) => ({ name, tax_id: MX_ONLY_DEBTORS.has(name) ? makeRfc() : makeRut() })))
    .select();
  if (debErr || !debtors) throw new Error(`debtors: ${debErr?.message}`);

  const debtorByName = new Map(debtors.map((d) => [d.name, d.id]));

  const cutoff90 = daysAgo(90);
  const summary: Array<{ name: string; status: CompanyStatus; cedida: number; total: number }> = [];

  for (const spec of DEMO_COMPANIES) {
    const cedidaCount = spec.invoices.filter(
      (i) =>
        (i.status === "cedida_xepelin" || i.status === "cedida_mx") &&
        i.issued_at >= cutoff90,
    ).length;
    const computedStatus = computeStatus(spec.invoices);

    const { data: company, error: cErr } = await db
      .from("companies")
      .insert({
        kam_id: kamA.id,
        name: spec.name,
        tax_id: makeTaxId(spec.country),
        country: spec.country,
        status: computedStatus,
        enrolled_at: spec.enrolled_at,
        credit_limit: spec.credit_limit,
        next_followup_date: spec.next_followup_date,
        is_demo: true,
        credit_risk_score: spec.credit_risk_score,
        sector: spec.sector,
        interaction_summary: spec.interaction_summary,
        news_context: spec.news_context,
        whatsapp_summary: spec.whatsapp_summary,
        management_status: "por_gestionar",
      })
      .select()
      .single();
    if (cErr || !company) throw new Error(`company ${spec.name}: ${cErr?.message}`);

    // Contact
    await db.from("contacts").insert({
      company_id: company.id,
      name: `Gerente Finanzas ${spec.name.split(" ")[0]}`,
      phone: spec.country === "CL"
        ? `+56 9 ${rint(1000, 9999)} ${rint(1000, 9999)}`
        : `+52 55 ${rint(1000, 9999)} ${rint(1000, 9999)}`,
      email: `finanzas@${spec.name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}.${spec.country === "CL" ? "cl" : "mx"}`,
    });

    // Invoices
    if (spec.invoices.length > 0) {
      const { error: invErr } = await db.from("invoices").insert(
        spec.invoices.map((inv) => ({
          company_id: company.id,
          debtor_id: debtorByName.get(inv.debtor) ?? pick(debtors).id,
          amount: inv.amount,
          issued_at: inv.issued_at,
          status: inv.status,
        })),
      );
      if (invErr) throw new Error(`invoices ${spec.name}: ${invErr.message}`);
    }

    // Notes
    if (spec.notes.length > 0) {
      const { error: nErr } = await db.from("notes").insert(
        spec.notes.map((content, idx) => ({
          company_id: company.id,
          kam_id: kamA.id,
          content,
          created_at: new Date(today.getTime() - (idx + 1) * 3 * DAY).toISOString(),
        })),
      );
      if (nErr) throw new Error(`notes ${spec.name}: ${nErr.message}`);
    }

    summary.push({ name: spec.name, status: computedStatus, cedida: cedidaCount, total: spec.invoices.length });
  }

  console.log(`\nSeeded 1 KAM, ${debtors.length} debtors, ${summary.length} companies.\n`);

  const col1 = Math.max(...summary.map((r) => r.name.length), 12);
  const header = `${"Company".padEnd(col1)}  ${"Status".padEnd(10)}  ${"Cedida(90d)".padEnd(11)}  Total`;
  console.log(header);
  console.log("─".repeat(header.length));
  for (const r of summary) {
    console.log(
      `${r.name.padEnd(col1)}  ${r.status.padEnd(10)}  ${String(r.cedida).padEnd(11)}  ${r.total}`,
    );
  }
  console.log();
  console.log(`Evaluator KAM email: ${seedEmail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
