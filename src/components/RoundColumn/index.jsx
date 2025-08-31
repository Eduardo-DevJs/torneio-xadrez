import MatchCard from "../MatchCard";

export function RoundColumn({
  title,
  matches,
  rounds,
  roundIndex,
  onPick,
  onBo3Win,
  onBo3Reset,
  bo3,
  readOnly,
  primary,
}) {
  return (
    <div className="min-w-[280px] flex-shrink-0">
      <div
        className="sticky p-3 top-0 z-10 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 py-2 mb-3"
        style={{
          background:
            "linear-gradient( to left, rgba(255,255,255,0.7), rgba(87, 58, 58, 0.3))",
        }}
      >
        <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-600 dark:text-neutral-300">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-4">
        {matches.map((m, i) => (
          <MatchCard
            key={i}
            match={m}
            rounds={rounds}
            roundIndex={roundIndex}
            matchIndex={i}
            onPick={onPick}
            onBo3Win={onBo3Win}
            onBo3Reset={onBo3Reset}
            bo3={bo3}
            readOnly={readOnly}
            primary={primary}
          />
        ))}
      </div>
    </div>
  );
}