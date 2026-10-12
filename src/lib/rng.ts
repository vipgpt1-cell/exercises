/** Seedable PRNG (mulberry32) so fixed test layouts are identical on every run. */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const defaultRng: Rng = Math.random

export function randInt(min: number, maxInclusive: number, rng: Rng = defaultRng) {
  return min + Math.floor(rng() * (maxInclusive - min + 1))
}

export function uniform(min: number, max: number, rng: Rng = defaultRng) {
  return min + rng() * (max - min)
}

export function shuffle<T>(arr: readonly T[], rng: Rng = defaultRng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** k distinct items from arr. */
export function sample<T>(arr: readonly T[], k: number, rng: Rng = defaultRng): T[] {
  return shuffle(arr, rng).slice(0, k)
}
