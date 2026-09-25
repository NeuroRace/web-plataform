"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";
import { CONSENT_METADATA_KEY, buildWebConsent } from "@/lib/consent";

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
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // NEU-85: e-mail já cadastrado. O Supabase (proteção contra enumeração) responde ao
  // signUp com "sucesso" e `identities: []`, sem enviar e-mail — sem este ramo a tela
  // mandava a pessoa esperar um e-mail que nunca chega.
  const [existingAccount, setExistingAccount] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExistingAccount(false);

    // NEU-103: o cadastro liga as corridas (dado de EEG) à conta, então exige aceite.
    if (isSignup && !consent) {
      setError("Para criar a conta, é preciso autorizar o uso dos seus dados de EEG.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const normalized = email.trim().toLowerCase();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { [CONSENT_METADATA_KEY]: buildWebConsent() },
        },
      });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setExistingAccount(true);
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

        {isSignup && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-bg/60 p-4 text-left">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-describedby="consent-hint"
              className="mt-0.5 h-4 w-4 shrink-0 accent-cyan"
            />
            <div className="space-y-1">
              <label htmlFor="consent" className="text-sm leading-snug text-fg">
                Autorizo o uso dos meus dados de EEG (atenção e relaxamento) para
                ver meu desempenho, aparecer no ranking e receber a análise da IA.
              </label>
              <p id="consent-hint" className="text-xs text-fg-muted">
                Guardamos os dados segundo a segundo por 90 dias. Você pode retirar a
                autorização quando quiser. Veja a{" "}
                <Link href="/privacidade" target="_blank" className="text-cyan underline">
                  política de privacidade
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink"
          >
            {error}
          </p>
        )}

        {existingAccount && (
          <p
            role="alert"
            className="rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink"
          >
            Este e-mail já tem conta. Nenhum e-mail foi enviado.{" "}
            <Link href="/login" className="underline">
              Entrar
            </Link>{" "}
            ou recupere a senha.
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
