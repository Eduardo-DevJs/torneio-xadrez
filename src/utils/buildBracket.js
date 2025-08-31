import { generateSeedingOrder } from "./generateSeedingOrder";
import { shuffle } from "./shuffle";

export function buildBracket(players, seedingMode = "random") {
  const clean = players.map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return { rounds: [], baseSize: 0, prelimCount: 0 };

  const n = clean.length;
  const base =
    n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : n <= 16 ? 16 : 32;
  const prelimMatches = n > base ? n - base : 0;
  const prelimPlayersCount = prelimMatches * 2;
  const hasPrelim = prelimMatches > 0;

  let seeded;
  if (seedingMode === "random") {
    seeded = shuffle(clean).map((name, i) => ({ seed: i + 1, name }));
  } else {
    seeded = clean.map((name, i) => ({ seed: i + 1, name }));
  }

  const directCount = n - prelimPlayersCount;
  const direct = seeded.slice(0, directCount);
  const prelimPlayers = seeded.slice(directCount);

  const rounds = [];
  if (hasPrelim) {
    const pre = [];
    for (let i = 0; i < prelimMatches; i++) {
      const p1 = { name: prelimPlayers[i * 2]?.name || null };
      const p2 = { name: prelimPlayers[i * 2 + 1]?.name || null };
      pre.push({ p1, p2, winnerIndex: -1, scores: [0, 0], meta: {} });
    }
    rounds.push(pre);
  }

  const order = generateSeedingOrder(base);
  const placeholderSeeds = [];
  for (let i = 0; i < prelimMatches; i++) placeholderSeeds.push(base - i);
  const placeholderMap = new Map(placeholderSeeds.map((s, i) => [s, i]));

  const seedToSlot = new Map();
  for (let s = 1; s <= base; s++) {
    if (placeholderMap.has(s)) {
      const idx = placeholderMap.get(s);
      seedToSlot.set(s, { source: { roundIndex: 0, matchIndex: idx } });
    } else if (s <= direct.length) {
      seedToSlot.set(s, { name: direct[s - 1].name });
    } else {
      seedToSlot.set(s, { name: null });
    }
  }

  const firstRound = [];
  for (let i = 0; i < base / 2; i++) {
    const sa = order[i * 2];
    const sb = order[i * 2 + 1];
    firstRound.push({
      p1: seedToSlot.get(sa),
      p2: seedToSlot.get(sb),
      winnerIndex: -1,
      scores: [0, 0],
      meta: {},
    });
  }
  rounds.push(firstRound);

  let currentSize = base / 2;
  while (currentSize > 1) {
    const prevIndex = rounds.length - 1;
    const next = [];
    for (let i = 0; i < currentSize / 2; i++) {
      next.push({
        p1: { source: { roundIndex: prevIndex, matchIndex: i * 2 } },
        p2: { source: { roundIndex: prevIndex, matchIndex: i * 2 + 1 } },
        winnerIndex: -1,
        scores: [0, 0],
        meta: {},
      });
    }
    rounds.push(next);
    currentSize = currentSize / 2;
  }

  return { rounds, baseSize: base, prelimCount: prelimMatches };
}