import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col">
      {/* Top nav bar */}
      <nav className="flex items-center justify-between px-8 py-5 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-sm font-semibold tracking-tight text-card-foreground">Cepelin</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">KAM CRM</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 bg-background">
        <div className="w-full max-w-sm space-y-8 text-center">
          {/* Icon badge */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>

          {/* Copy */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Tu cartera, bajo control
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Activa clientes, aumenta tu Share of Wallet y detecta riesgo de fuga antes de que ocurra.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <LoginButton />
            <p className="text-xs text-muted-foreground">
              Solo para KAMs de Cepelin · Acceso con cuenta Google corporativa
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-background">
        © {new Date().getFullYear()} Cepelin · Plataforma interna
      </footer>
    </main>
  );
}
