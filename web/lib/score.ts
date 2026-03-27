function trimTrailingZero(value: number) {
  return value.toFixed(1).replace(/\.0$/, '');
}

export function formatScore10From100(value?: number | null) {
  const safe = Math.max(0, Math.min(100, value ?? 0));
  return `${trimTrailingZero(safe / 10)}/10`;
}

export function formatScore10FromUnit(value?: number | null) {
  const safe = Math.max(0, Math.min(1, value ?? 0));
  return `${trimTrailingZero(safe * 10)}/10`;
}
