export default function PlayerButton({
  label,
  disabled,
  active,
  onClick,
  primary,
}) {
  const activeStyle = active
    ? { borderColor: primary, boxShadow: `0 0 0 4px ${primary}33` }
    : {};
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-xl border transition ${
        active
          ? "ring-2 bg-white/70 dark:bg-neutral-900/50"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-white dark:bg-neutral-900"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      style={activeStyle}
    >
      <span className="font-medium truncate block">{label || "(vago)"}</span>
    </button>
  );
}
