import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16: convenção "proxy" (substitui "middleware").
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto assets estáticos, imagens e fontes.
     * NEU-176: as fontes saem de /fonts (antes vinham de /_next/static); sem a
     * exceção, cada fonte passava pelo Supabase e reescrevia o cookie de sessão.
     */
    "/((?!_next/static|_next/image|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
