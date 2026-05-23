import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-semibold tracking-tight text-white">Cepelin</span>
            <span className="hidden text-xs text-slate-400 sm:block">KAM CRM</span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
