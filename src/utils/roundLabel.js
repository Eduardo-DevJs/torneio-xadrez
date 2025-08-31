export function roundLabel(idx, hasPrelim, baseSize) {
  if (hasPrelim && idx === 0) return "Pré";
  const offset = hasPrelim ? 1 : 0;
  const r = idx - offset;
  const size = baseSize / Math.pow(2, r);
  if (size === 2) return "Final";
  if (size === 4) return "Semifinal";
  if (size === 8) return "Quartas";
  if (size === 16) return "Oitavas";
  return `R${size}`;
}
