"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";
import { hardNavigate } from "@/lib/hard-navigate";
import { safeNext } from "@/lib/safe-next";
import { Reveal } from "@/components/Reveal";
import { parseIdentifier, describeIdentifier, CODE_LENGTH, type Identifier } from "@/lib/identifier";
import { translateSendError, translateVerifyError } from "@/lib/otp-errors";

// NEU-161: o site entra sem senha. A pessoa digita e-mail ou celular, recebe um
// código e entra com ele. Quem não tem conta ganha uma no mesmo passo, então
// `/cadastro` deixou de existir como fluxo separado.
//
// Por que código e não só link: o site usa o fluxo PKCE do Supabase, e esse link
// só abre no mesmo navegador que pediu. No estande a pessoa pede no celular e
// às vezes abre no notebook — sem código, ela não entraria.

const RESEND_SECONDS = 60;

// O link do e-mail que falha volta para cá com `?error`. Antes isso não era lido
// em lugar nenhum, e a pessoa caía no login sem entender o que houve.
function translateLinkError(code: string | null): string | null {
  if (!code) return null;
  if (code === "confirm") return "Esse link não funcionou ou já venceu. Peça um código novo abaixo.";
  if (code === "auth") return "Não deu para completar o acesso. Tente de novo abaixo.";
  return "Algo deu errado no acesso. Tente de novo abaixo.";
}

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg-strong placeholder:text-fg-muted focus:border-cyan focus:outline-none";

export function AuthForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [raw, setRaw] = useState("");
  const [sentTo, setSentTo] = useState<Identifier | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Erro vindo do link do e-mail, mostrado até a pessoa pedir outro código.
  const [linkError, setLinkError] = useState<string | null>(() => translateLinkError(params.get("error")));

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  async function enviarCodigo(id: Identifier) {
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    return id.kind === "phone"
      ? supabase.auth.signInWithOtp({ phone: id.value })
      : supabase.auth.signInWithOtp({
          email: id.kind === "email" ? id.value : "",
          options: { emailRedirectTo },
        });
  }

  async function onPedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setLinkError(null);

    const id = parseIdentifier(raw);
    if (id.kind === "invalid") {
      setError(
        id.reason === "empty"
          ? "Digite seu e-mail ou celular."
          : id.reason === "email"
            ? "E-mail inválido."
            : "Celular inválido. Use DDD + número, como 11 98765-4321.",
      );
      return;
    }

    setLoading(true);
    const { error: err } = await enviarCodigo(id);
    setLoading(false);

    if (err) {
      setError(translateSendError(err));
      return;
    }
    setSentTo(id);
    setCode("");
    setSecondsLeft(RESEND_SECONDS);
  }

  async function onReenviar() {
    if (!sentTo || secondsLeft > 0) return;
    setError(null);
    setLoading(true);
    const { error: err } = await enviarCodigo(sentTo);
    setLoading(false);
    if (err) {
      setError(translateSendError(err));
      return;
    }
    setAviso("Código reenviado.");
    setSecondsLeft(RESEND_SECONDS);
  }

  async function onConferirCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo || sentTo.kind === "invalid") return;
    setError(null);
    setAviso(null);
    setLoading(true);

    const supabase = createClient();
    const token = code.trim();
    const { error: err } =
      sentTo.kind === "phone"
        ? await supabase.auth.verifyOtp({ phone: sentTo.value, token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: sentTo.value, token, type: "email" });

    if (err) {
      setLoading(false);
      setError(translateVerifyError(err, "Não deu para entrar agora. Tente de novo."));
      return;
    }
    // Navegação completa, não router.push: em produção o link "Meu Desempenho" faz
    // prefetch do /dashboard ainda deslogado, e o roteador guarda o redirect para
    // /login. O push depois reaproveitava esse cache e voltava para esta tela.
    hardNavigate(next);
  }

  const naTelaDoCodigo = sentTo !== null && sentTo.kind !== "invalid";
  const tamanhoDoCodigo = naTelaDoCodigo ? CODE_LENGTH[sentTo.kind] : CODE_LENGTH.email;

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      <Reveal>
        <h1 className="text-center font-display text-3xl font-extrabold sm:text-4xl text-attention w-fit mx-auto pb-1">
          {naTelaDoCodigo ? "Digite o código" : "Acesso à plataforma"}
        </h1>
        <p className="mt-2 mb-8 text-center text-fg">
          {naTelaDoCodigo
            ? `Enviamos um código para ${describeIdentifier(sentTo)}.`
            : "Use o mesmo e-mail ou celular que você deu no estande."}
        </p>
      </Reveal>

      <div className="w-full glass-card p-8 sm:p-10">
        {linkError && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink"
          >
            {linkError}
          </p>
        )}

        {!naTelaDoCodigo ? (
          <form onSubmit={onPedirCodigo} className="space-y-4" noValidate>
            <div className="space-y-1.5 text-left">
              <label htmlFor="identificador" className="text-sm font-medium text-fg">
                E-mail ou celular
              </label>
              <input
                id="identificador"
                type="text"
                autoComplete="username"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="seu@email.com ou (11) 98765-4321"
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={onConferirCodigo} className="space-y-4" noValidate>
            <div className="space-y-1.5 text-left">
              <label htmlFor="codigo" className="text-sm font-medium text-fg">
                Código
              </label>
              <input
                id="codigo"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={tamanhoDoCodigo}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={"0".repeat(tamanhoDoCodigo)}
                className={inputClass}
              />
              <p className="text-xs text-fg-muted">
                {sentTo.kind === "phone"
                  ? "São 6 dígitos, por SMS."
                  : "São 8 dígitos. No mesmo aparelho, dá para tocar no link do e-mail."}
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink">
                {error}
              </p>
            )}
            {aviso && <p className="text-sm text-fg">{aviso}</p>}

            <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
              {loading ? "Aguarde..." : "Entrar"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={onReenviar}
                disabled={secondsLeft > 0 || loading}
                className="text-cyan underline disabled:text-fg-muted disabled:no-underline"
              >
                {secondsLeft > 0 ? `Reenviar código em ${secondsLeft}s` : "Reenviar código"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentTo(null);
                  setError(null);
                  setAviso(null);
                }}
                className="text-cyan underline"
              >
                Trocar e-mail ou celular
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fg-muted">
        🔒 Seus dados estão protegidos.
      </p>
    </div>
  );
}
