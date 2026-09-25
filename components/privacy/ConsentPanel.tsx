"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";
import { site } from "@/lib/site";
import {
  CONSENT_METADATA_KEY,
  buildWebConsent,
  revokeConsent,
  type ConsentRecord,
} from "@/lib/consent";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * NEU-103: estado da autorização LGPD no dashboard. Serve a quem criou a conta antes
 * do termo (dar o aceite aqui) e cumpre a promessa do termo de retirar pelo site.
 */
export function ConsentPanel({ consent }: { consent: ConsentRecord | null }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const granted = consent !== null && consent.revoked_at === null;

  async function save(record: ConsentRecord) {
    setSaving(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({
      data: { [CONSENT_METADATA_KEY]: record },
    });
    setSaving(false);
    if (error) {
      setError("Não foi possível salvar agora. Tente novamente.");
      return;
    }
    setConfirmingRevoke(false);
    router.refresh();
  }

  const policyLink = (
    <Link href="/privacidade" className="text-cyan underline">
      política de privacidade
    </Link>
  );

  return (
    <section
      aria-labelledby="consent-title"
      className="rounded-card border border-border bg-surface/40 p-5 sm:p-6"
    >
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
        Privacidade · LGPD
      </p>

      {granted ? (
        <>
          <h2 id="consent-title" className="mt-2 font-display text-lg font-semibold text-fg-strong">
            Uso dos seus dados de EEG
          </h2>
          <p className="mt-2 text-sm text-fg">
            Autorizado em {formatDate(consent.granted_at)} (termo {consent.term_version}).
            Detalhes na {policyLink}.
          </p>

          {confirmingRevoke ? (
            <div className="mt-4 rounded-lg border border-pink/40 bg-pink/10 p-4">
              <p className="text-sm text-fg">
                Ao retirar, o NeuroCoach deixa de analisar suas corridas. Para apagar
                os dados já guardados, escreva para{" "}
                <a href={`mailto:${site.privacyContact}`} className="text-cyan underline">
                  {site.privacyContact}
                </a>
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(revokeConsent(consent))}
                  className={buttonClass("secondary", "py-2 text-sm")}
                >
                  {saving ? "Salvando..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmingRevoke(false)}
                  className={buttonClass("ghost", "py-2 text-sm")}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRevoke(true)}
              className={buttonClass("ghost", "mt-3 px-0 py-1 text-sm")}
            >
              Retirar autorização
            </button>
          )}
        </>
      ) : (
        <>
          <h2 id="consent-title" className="mt-2 font-display text-lg font-semibold text-fg-strong">
            O NeuroCoach está desligado
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg">
            A análise da IA usa médias do seu foco e do seu relaxamento, sem nome nem
            e-mail, enviadas a um serviço de IA (Groq). Isso precisa da sua
            autorização. Leia a {policyLink}.
          </p>
          <div className="mt-4 flex items-start gap-3">
            <input
              id="consent-dashboard"
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-cyan"
            />
            <label htmlFor="consent-dashboard" className="text-sm leading-snug text-fg">
              Autorizo o uso dos meus dados de EEG como descrito na política de
              privacidade.
            </label>
          </div>
          <button
            type="button"
            disabled={!checked || saving}
            onClick={() => save(buildWebConsent())}
            className={buttonClass("primary", "mt-4 py-2 text-sm")}
          >
            {saving ? "Salvando..." : "Autorizar"}
          </button>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-pink/40 bg-pink/10 px-4 py-2 text-sm text-pink"
        >
          {error}
        </p>
      )}
    </section>
  );
}
