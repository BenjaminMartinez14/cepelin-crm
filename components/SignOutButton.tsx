"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/");
  }

  return (
    <button
      onClick={signOut}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
    >
      Cerrar sesión
    </button>
  );
}
