import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

/**
 * Verifica o token de confirmação de e-mail (token_hash).
 * Usado quando o template de e-mail do Supabase aponta para /auth/confirm.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // NEU-161: passa pelo safeNext, como o /auth/callback ja fazia. Sem isto, um
  // `?next=/%09/example.com` normaliza para "//example.com" e o redirect sai do
  // site — o mesmo buraco que a NEU-131 fechou do outro lado.
  const next = safeNext(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
