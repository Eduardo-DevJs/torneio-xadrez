import { deepClone } from "./deepClone";

export function clearDownstream(rounds, roundIndex, matchIndex) {
  const R = deepClone(rounds);
  for (let r = roundIndex + 1; r < R.length; r++) {
    for (let m = 0; m < R[r].length; m++) {
      const mm = R[r][m];
      const src1 = mm.p1?.source;
      const src2 = mm.p2?.source;
      const depends =
        (src1 &&
          src1.roundIndex === roundIndex &&
          src1.matchIndex === matchIndex) ||
        (src2 &&
          src2.roundIndex === roundIndex &&
          src2.matchIndex === matchIndex);
      if (depends) {
        mm.winnerIndex = -1;
        mm.scores = [0, 0];
        if (!mm.meta) mm.meta = {};
        const sub = clearDownstream(R, r, m);
        return sub;
      }
    }
  }
  return R;
}
