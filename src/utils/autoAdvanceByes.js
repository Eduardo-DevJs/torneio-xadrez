import { deepClone } from "./deepClone";
import { resolveSlotName } from "./resolveSlotName";

export function autoAdvanceByes(rounds) {
  const R = deepClone(rounds);
  let changed = false;
  for (let r = 0; r < R.length; r++) {
    for (let i = 0; i < R[r].length; i++) {
      const match = R[r][i];
      if (match.winnerIndex !== -1) continue;
      const n1 = resolveSlotName(match.p1, R);
      const n2 = resolveSlotName(match.p2, R);
      if (n1 && !n2) {
        match.winnerIndex = 0;
        changed = true;
      } else if (!n1 && n2) {
        match.winnerIndex = 1;
        changed = true;
      }
    }
  }
  return { rounds: R, changed };
}
