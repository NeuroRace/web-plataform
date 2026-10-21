import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase a cada request e protege as rotas autenticadas.
 * Baseado no padrão oficial do @supabase/ssr para Next App Router.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não rodar código entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protege /dashboard: sem sessão → manda pro login (guardando o destino).
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(loginRedirectUrl(request.nextUrl));
  }

  return response;
}

/**
 * URL do login que volta para `from` depois de entrar. A query do painel
 * (`?moldura`, `?tab`) vai dentro do `next`, não na URL do login (NEU-136).
 */
export function loginRedirectUrl(from: Pick<URL, "origin" | "pathname" | "search">): URL {
  const url = new URL("/login", from.origin);
  url.searchParams.set("next", from.pathname + from.search);
  return url;
}
