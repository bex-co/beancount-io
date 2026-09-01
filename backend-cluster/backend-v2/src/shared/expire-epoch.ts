export function getExpireEpoch(minutes: number): number {
  return Date.now() + minutes * 60 * 1000;
}

// Alias for getExpireEpoch - maintains API compatibility while reducing code duplication
export const getExpireEpochMins = (mins: number): number =>
  getExpireEpoch(mins);
