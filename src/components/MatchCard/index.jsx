import { formatTime } from "../../utils/FormaTime";
import { resolveSlotName } from "../../utils/resolveSlotName";
import Pill from "../Pill";
import PlayerButton from "../PlayerButton";
import ScoreControls from "../ScoreControls";

export default function MatchCard({
  match,
  rounds,
  onPick,
  onBo3Win,
  onBo3Reset,
  roundIndex,
  matchIndex,
  bo3,
  readOnly,
  primary,
}) {
  const n1 = resolveSlotName(match.p1, rounds);
  const n2 = resolveSlotName(match.p2, rounds);
  const ready = Boolean(n1 && n2);
  const mesa = match.meta?.table;
  const horario = match.meta?.timeISO;
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900 shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <Pill>Partida {matchIndex + 1}</Pill>
        <div className="flex items-center gap-2">
          {mesa && (
            <Pill className="border-blue-200 dark:border-blue-800">
              Mesa {mesa}
            </Pill>
          )}
          {horario && (
            <Pill className="border-amber-200 dark:border-amber-800">
              {formatTime(horario)}
            </Pill>
          )}
          {match.winnerIndex !== -1 && (
            <Pill className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              Vencedor escolhido
            </Pill>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <PlayerButton
          label={n1}
          disabled={!n1 || !ready || readOnly || (bo3 && true)}
          active={match.winnerIndex === 0}
          onClick={() => onPick(roundIndex, matchIndex, 0)}
          primary={primary}
        />
        <PlayerButton
          label={n2}
          disabled={!n2 || !ready || readOnly || (bo3 && true)}
          active={match.winnerIndex === 1}
          onClick={() => onPick(roundIndex, matchIndex, 1)}
          primary={primary}
        />
        {bo3 && (
          <ScoreControls
            scores={match.scores || [0, 0]}
            onWinP1={() => onBo3Win(roundIndex, matchIndex, 0)}
            onWinP2={() => onBo3Win(roundIndex, matchIndex, 1)}
            onReset={() => onBo3Reset(roundIndex, matchIndex)}
            disabled={!ready || readOnly || match.winnerIndex !== -1}
          />
        )}
      </div>
    </div>
  );
}
