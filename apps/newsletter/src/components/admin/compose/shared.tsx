export function Divider() {
  return <div className="h-px bg-bs-cream/10" />;
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
        checked ? "bg-bs-cream/30" : "bg-bs-cream/10"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          checked ? "translate-x-4 bg-bs-cream" : "translate-x-0 bg-bs-cream/40"
        }`}
      />
    </button>
  );
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
