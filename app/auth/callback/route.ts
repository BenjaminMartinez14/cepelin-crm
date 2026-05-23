import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth callback: exchange the code for a session, then provision a KAM +
// demo portfolio if this email is signing in for the first time.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  // Idempotent: creates the KAM + clones the demo portfolio only on first login.
  await supabase.rpc("provision_demo_kam");

  return NextResponse.redirect(`${origin}/dashboard`);
}
