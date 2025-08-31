export function resolveSlotName(slot, rounds) {
  if (!slot) return null;
  if (slot.name) return slot.name;
  if (slot.source) {
    const m = rounds?.[slot.source.roundIndex]?.[slot.source.matchIndex];
    if (!m) return null;
    const wIdx = m.winnerIndex;
    if (wIdx === 0) return resolveSlotName(m.p1, rounds);
    if (wIdx === 1) return resolveSlotName(m.p2, rounds);
    if (slot.source.roundIndex === 0)
      return `Vencedor Pré ${slot.source.matchIndex + 1}`;
    return `Vencedor R${slot.source.roundIndex + 1} M${
      slot.source.matchIndex + 1
    }`;
  }
  return null;
}
