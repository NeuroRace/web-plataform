"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Tente entrar.";
  if (m.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  return "Algo deu errado. Tente novamente.";
}

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg-strong placeholder:text-fg-muted focus:border-cyan focus:outline-none";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const normalized = email.trim().toLowerCase();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        router.push(`/confirmar?email=${encodeURIComponent(normalized)}`);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-md rounded-card border border-cyan/40 bg-card p-8 sm:p-10">
      <h1 className="text-center font-display text-3xl font-bold text-gradient">
        {isSignup ? "Criar conta" : "Acessar plataforma"}
      </h1>
      <p className="mt-2 text-center text-sm text-fg">
        {isSignup
          ? "Cadastre-se com o mesmo e-mail que você usou no jogo."
          : "Entre para conferir o seu desempenho."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5 text-left">
          <label htmlFor="email" className="text-sm font-medium text-fg">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="password" className="text-sm font-medium text-fg">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
          {isSignup && (
            <p className="text-xs text-fg-muted">Mínimo de 6 caracteres.</p>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={buttonClass("primary", "w-full")}
        >
          {loading
            ? "Aguarde..."
            : isSignup
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-fg">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-cyan underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-cyan underline">
              Cadastre-se
            </Link>
          </>
        )}
      </p>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fg-muted">
        🔒 Seus dados estão protegidos.
      </p>
    </div>
  );
}
