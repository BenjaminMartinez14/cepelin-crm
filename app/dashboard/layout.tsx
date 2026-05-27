import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-semibold tracking-tight text-card-foreground">Cepelin</span>
            <span className="hidden text-xs text-muted-foreground sm:block">KAM CRM</span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
