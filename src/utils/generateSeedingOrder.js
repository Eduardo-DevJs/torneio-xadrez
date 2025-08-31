export function generateSeedingOrder(size) {
  let seeds = [1, 2];
  let s = 2;
  while (s < size) {
    const next = [];
    s *= 2;
    for (const x of seeds) {
      next.push(x);
      next.push(s + 1 - x);
    }
    seeds = next;
  }
  return seeds;
}
