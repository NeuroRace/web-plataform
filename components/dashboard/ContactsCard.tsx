"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";
import { hardNavigate } from "@/lib/hard-navigate";
import { maskPhone } from "@/lib/account";
import { parseIdentifier, describeIdentifier, CODE_LENGTH } from "@/lib/identifier";
import { translateSendError, translateVerifyError, type ContactKind } from "@/lib/otp-errors";

// NEU-163: a Joana correu no estande dando o celular e entrou no site com o
// e-mail. Sem o celular na conta, a corrida dela não aparece. Aqui ela adiciona
// o contato que falta e confirma com um código; quem liga as corridas desse
// contato à conta é o banco, ao confirmar (gatilhos da NEU-159 e do e-mail).
//
// Fica separado do login (AuthForm) de propósito: se precisar tirar, o login
// não muda.

type Kind = ContactKind;

const RESEND_SECONDS = 60;
const AFTER_CONFIRM = "/dashboard?tab=perfil";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg-strong placeholder:text-fg-muted focus:border-attention focus:outline-none";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink">
      {children}
    </p>
  );
}

/** `email` e `phone`: só os contatos já confirmados da conta (null se não tem). */
export function ContactsCard({ email, phone }: { email: string | null; phone: string | null }) {
  const [adding, setAdding] = useState<Kind | null>(null);
  const [raw, setRaw] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  function start(kind: Kind) {
    setAdding(kind);
    setRaw("");
    setSentTo(null);
    setCode("");
    setError(null);
    setAviso(null);
  }

  async function send(kind: Kind, value: string) {
    const supabase = createClient();
    if (kind === "phone") return supabase.auth.updateUser({ phone: value });
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(AFTER_CONFIRM)}`;
    return supabase.auth.updateUser({ email: value }, { emailRedirectTo });
  }

  async function onPedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!adding || loading) return;
    const kind = adding;
    setError(null);
    // A espera vale também para outro número: "Trocar" não zera o tempo (review do #32).
    if (secondsLeft > 0) {
      setError(`Espere ${secondsLeft}s para pedir outro código.`);
      return;
    }

    const id = parseIdentifier(raw);
    if (id.kind !== kind) {
      setError(kind === "phone" ? "Celular inválido. Use DDD + número, como 11 98765-4321." : "E-mail inválido.");
      return;
    }

    setLoading(true);
    const { error: err } = await send(kind, id.value);
    setLoading(false);
    if (err) {
      setError(translateSendError(err, kind));
      return;
    }
    setSentTo(id.value);
    setCode("");
    setSecondsLeft(RESEND_SECONDS);
  }

  async function onReenviar() {
    if (!adding || !sentTo || secondsLeft > 0) return;
    const kind = adding;
    setError(null);
    setAviso(null);
    setLoading(true);
    const { error: err } = await send(kind, sentTo);
    setLoading(false);
    if (err) {
      setError(translateSendError(err, kind));
      return;
    }
    setAviso("Código reenviado.");
    setSecondsLeft(RESEND_SECONDS);
  }

  async function onConferirCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!adding || !sentTo) return;
    setError(null);
    setAviso(null);
    setLoading(true);

    const supabase = createClient();
    const token = code.trim();
    const { error: err } =
      adding === "phone"
        ? await supabase.auth.verifyOtp({ phone: sentTo, token, type: "phone_change" })
        : await supabase.auth.verifyOtp({ email: sentTo, token, type: "email_change" });

    if (err) {
      setLoading(false);
      setError(translateVerifyError(err, "Não deu para confirmar agora. Tente de novo."));
      return;
    }
    // Recarrega a página inteira: o servidor relê a conta e as corridas que o
    // banco acabou de ligar ao novo contato.
    hardNavigate(AFTER_CONFIRM);
  }

  const codigoCompleto = adding !== null && new RegExp(`^\\d{${CODE_LENGTH[adding]}}$`).test(code.trim());

  return (
    <section aria-labelledby="contatos-titulo" className="glass-card mt-6 p-6 sm:p-8">
      <h2 id="contatos-titulo" className="font-display text-2xl font-bold text-fg-strong">
        Seus contatos
      </h2>
      <p className="mt-2 text-sm text-fg-muted">
        Correu no estande com outro e-mail ou celular? Adicione aqui e a corrida aparece no seu painel.
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-fg-muted">E-mail</dt>
          <dd className="flex items-center gap-3 text-fg-strong">
            {email ?? <span className="text-fg-muted">não adicionado</span>}
            {!email && adding === null && (
              <button type="button" onClick={() => start("email")} className="text-attention underline">
                Adicionar e-mail
              </button>
            )}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-fg-muted">Celular</dt>
          <dd className="flex items-center gap-3 text-fg-strong">
            {phone ? maskPhone(phone) : <span className="text-fg-muted">não adicionado</span>}
            {!phone && adding === null && (
              <button type="button" onClick={() => start("phone")} className="text-attention underline">
                Adicionar celular
              </button>
            )}
          </dd>
        </div>
      </dl>

      {adding && !sentTo && (
        <form onSubmit={onPedirCodigo} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="novo-contato" className="text-sm font-medium text-fg">
              {adding === "phone" ? "Celular" : "E-mail"}
            </label>
            <input
              id="novo-contato"
              type={adding === "phone" ? "tel" : "email"}
              autoComplete={adding === "phone" ? "tel" : "email"}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={adding === "phone" ? "(11) 98765-4321" : "seu@email.com"}
              className={inputClass}
            />
            {adding === "phone" && (
              <p className="text-xs text-fg-muted">
                Com seu celular, o NeuroRace te avisa por WhatsApp das suas corridas e prêmios. Nada de
                propaganda. Responda SAIR para parar.
              </p>
            )}
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className={buttonClass("primary")}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
            <button type="button" onClick={() => setAdding(null)} disabled={loading} className={buttonClass("secondary")}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {adding && sentTo && (
        <form onSubmit={onConferirCodigo} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="codigo-contato" className="text-sm font-medium text-fg">
              Código
            </label>
            <p className="text-sm text-fg">
              Enviamos um código para {describeIdentifier({ kind: adding, value: sentTo })}.
            </p>
            <input
              id="codigo-contato"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH[adding]}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={"0".repeat(CODE_LENGTH[adding])}
              className={inputClass}
            />
            <p className="text-xs text-fg-muted">
              {adding === "phone" ? "São 6 dígitos, por SMS." : "São 8 dígitos, no e-mail."}
            </p>
          </div>
          {error && <Alert>{error}</Alert>}
          {aviso && <p className="text-sm text-fg">{aviso}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading || !codigoCompleto}
              className={buttonClass("primary")}
            >
              {loading ? "Aguarde..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={onReenviar}
              disabled={secondsLeft > 0 || loading}
              className="text-sm text-attention underline disabled:text-fg-muted disabled:no-underline"
            >
              {secondsLeft > 0 ? `Reenviar código em ${secondsLeft}s` : "Reenviar código"}
            </button>
            <button
              type="button"
              onClick={() => start(adding)}
              disabled={loading}
              className="text-sm text-attention underline disabled:text-fg-muted disabled:no-underline"
            >
              Trocar {adding === "phone" ? "celular" : "e-mail"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
