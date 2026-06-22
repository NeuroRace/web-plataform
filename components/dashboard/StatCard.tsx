export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-6 text-center">
      <div className="font-display text-3xl font-bold text-gradient">
        {value}
      </div>
      <div className="mt-1 text-sm text-fg">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-fg-muted">{hint}</div>}
    </div>
  );
}
