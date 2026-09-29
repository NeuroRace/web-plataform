"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClass } from "@/components/ui/Button";

const MIN = 3;
const MAX = 20;

/**
 * Define o apelido público do jogador (`profiles.display_name`).
 *
 * Esta é a ÚNICA escrita que o front faz no banco, e é intencional: o backend
 * criou a policy `profiles_update_own` e o grant de UPDATE para `authenticated`
 * exatamente para isso (ver cloud-backend/docs/frontend-integration.md §7).
 * As tabelas de corrida seguem sendo somente-leitura aqui.
 */
export function DisplayNameForm({
  userId,
  initialName,
  onSaved,
}: {
  userId: string;
  initialName: string | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    // O banco tem CHECK de 3..20 e btrim; validamos antes para dar mensagem
    // boa em vez de deixar a constraint estourar.
    const trimmed = name.trim();
    if (trimmed.length < MIN || trimmed.length > MAX) {
      setError(`O apelido precisa ter entre ${MIN} e ${MAX} caracteres.`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId)
      .select("id");
    setLoading(false);

    if (err) {
      // 23505 = unique_violation. display_name é citext unique: "breq" colide com "Breq".
      setError(
        err.code === "23505"
          ? "Esse apelido já está em uso. Escolha outro."
          : "Não consegui salvar agora. Tente de novo.",
      );
      return;
    }

    // Bug latente (NEU-78): update de 0 linhas não retorna erro, mas não salvou.
    if (!data || data.length === 0) {
      setError("Erro interno: perfil não encontrado no sistema.");
      return;
    }

    setName(trimmed);
    setSaved(true);
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label
        htmlFor="display-name"
        className="block text-sm font-medium text-fg-strong"
      >
        Seu apelido no ranking
      </label>
      <p className="mt-1 text-xs text-fg-muted">
        É o nome que aparece publicamente. Seu e-mail nunca é exibido.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="display-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="ex.: Breq"
          autoComplete="off"
          aria-describedby="display-name-hint"
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg-strong placeholder:text-fg-muted focus:border-attention focus:outline-none sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={loading}
          className={buttonClass("primary", "sm:w-auto")}
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <p id="display-name-hint" className="mt-2 text-xs text-fg-muted">
        Entre {MIN} e {MAX} caracteres.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-meditation">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-2 text-sm text-attention">
          Apelido salvo. Você aparece no ranking assim que terminar uma corrida.
        </p>
      )}
    </form>
  );
}
