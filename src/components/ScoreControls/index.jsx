export default function ScoreControls({
  scores,
  onWinP1,
  onWinP2,
  onReset,
  disabled,
}) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || scores[0] >= 2}
          onClick={onWinP1}
          className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700"
        >
          Vitória P1
        </button>
        <span className="font-mono px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800">
          {scores[0]} - {scores[1]}
        </span>
        <button
          type="button"
          disabled={disabled || scores[1] >= 2}
          onClick={onWinP2}
          className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700"
        >
          Vitória P2
        </button>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onReset}
        className="px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700"
      >
        Reset
      </button>
    </div>
  );
}
