import { mulberry32 } from '../../lib/rng'

export const TRAIL_ASPECT = 1.25 // height / width

export interface Pt {
  x: number
  y: number
}

/**
 * Deterministic trail layout in a 1 × 1.25 box. Like the paper Trail Making Test,
 * consecutive targets are placed at moderate distances in random directions, so the
 * path winds across the page without long jumps. Same seed → same layout, which keeps
 * repeated tests comparable.
 */
export function trailLayout(n: number, seed: number, minDist = 0.155): Pt[] {
  const H = TRAIL_ASPECT
  const m = 0.075
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = mulberry32(seed + attempt * 7919)
    const pts: Pt[] = [{ x: m + rng() * (1 - 2 * m), y: m + rng() * (H - 2 * m) }]
    let failed = false
    for (let i = 1; i < n && !failed; i++) {
      let placed = false
      for (let tries = 0; tries < 400; tries++) {
        const prev = pts[i - 1]
        const ang = rng() * Math.PI * 2
        const dist = 0.17 + rng() * 0.3
        const p = { x: prev.x + Math.cos(ang) * dist, y: prev.y + Math.sin(ang) * dist }
        if (p.x < m || p.x > 1 - m || p.y < m || p.y > H - m) continue
        if (pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < minDist)) continue
        // keep the next segment from crossing too close to earlier targets
        pts.push(p)
        placed = true
        break
      }
      if (!placed) failed = true
    }
    if (!failed) return pts
  }
  // Fallback: grid-ish jitter (should never be needed)
  const rng = mulberry32(seed)
  return Array.from({ length: n }, (_, i) => ({ x: 0.1 + ((i % 5) / 4) * 0.8 + (rng() - 0.5) * 0.04, y: 0.1 + (Math.floor(i / 5) / 4) * (H - 0.2) }))
}

export type TrailScript = 'latin' | 'uzbek' | 'cyrillic'

/** Alphabet order per language (the Uzbek Latin alphabet has no C). */
export const LETTERS: Record<TrailScript, string[]> = {
  latin: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
  uzbek: ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
  cyrillic: ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М'],
}

export function trailLabels(part: 'A' | 'B', n: number, script: TrailScript): string[] {
  if (part === 'A') return Array.from({ length: n }, (_, i) => String(i + 1))
  const out: string[] = []
  for (let i = 0; out.length < n; i++) {
    out.push(String(i + 1))
    if (out.length < n) out.push(LETTERS[script][i])
  }
  return out
}

export function pathLength(pts: Pt[]) {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return L
}
