// Shared domain types. Mirror the SQL schema in supabase/migrations.

export type Country = "CL" | "MX";

export type CompanyStatus = "enrolled" | "active" | "recurring";

export type InvoiceStatus =
  | "issued"
  | "assigned_cepelin"
  | "assigned_competitor"
  | "in_collection"
  | "collected";

export type ChurnRisk = "low" | "medium" | "high";

export interface KAM {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Company {
  id: string;
  kam_id: string;
  name: string;
  tax_id: string;
  country: Country;
  status: CompanyStatus;
  enrolled_at: string;
  credit_limit: number;
  next_followup_date: string | null;
  credit_risk_score: number | null;
  // Part 2 (nullable until the AI service populates them).
  health_score: number | null;
  churn_risk: ChurnRisk | null;
  ai_summary: string | null;
  recommended_actions: string[] | null;
  ai_generated_at: string | null;
}

// company_metrics view: company columns + computed fields.
export interface CompanyMetrics extends Omit<Company, "kam_id"> {
  kam_id: string;
  credit_used: number;
  credit_available: number;
  days_since_last_op: number | null;
  volume_60d: number;
  sow_percentage: number | null;
  invoice_status_counts: Record<string, number> | null;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface Debtor {
  id: string;
  name: string;
  tax_id: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  debtor_id: string;
  amount: number;
  issued_at: string;
  status: InvoiceStatus;
}

export interface InvoiceWithDebtor extends Invoice {
  debtor_name: string;
}

export interface Note {
  id: string;
  company_id: string;
  kam_id: string;
  content: string;
  created_at: string;
}

export interface MonthlyVolumePoint {
  month: string; // YYYY-MM
  volume: number;
}

export interface TopDebtor {
  debtor_id: string;
  name: string;
  total: number;
}

// Full payload for the company detail view.
export interface CompanyDetail {
  company: CompanyMetrics;
  contacts: Contact[];
  invoices: InvoiceWithDebtor[];
  monthly_volume: MonthlyVolumePoint[];
  top_debtors: TopDebtor[];
  notes: Note[];
}

// Consistent API envelope used by every route.
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
