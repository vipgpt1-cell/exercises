/**
 * Lightweight animated exercise figures (pure SVG, no images).
 * A pose is a set of numbers; <Animated> interpolates between key poses in a loop.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../../lib/hooks'

export type Pose = Record<string, number>

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  if (!a || !b) return a ?? b ?? {}
  const out: Pose = { ...a }
  for (const k of Object.keys(b)) out[k] = (a[k] ?? b[k]) + (b[k] - (a[k] ?? b[k])) * t
  return out
}

/**
 * Loops through `frames` (A → B → … → A). `period` = seconds for one full cycle.
 * `hold` = fraction of each segment spent holding the pose.
 */
export function Animated({ frames, period = 3, hold = 0.25, paused, render }: { frames: Pose[]; period?: number; hold?: number; paused?: boolean; render: (p: Pose) => ReactNode }) {
  const reduced = useReducedMotion()
  const [pose, setPose] = useState<Pose>(frames[0])
  const raf = useRef(0)
  const t0 = useRef(performance.now())
  const framesKey = JSON.stringify(frames)
  useEffect(() => {
    if (frames.length < 2 || reduced) {
      setPose(frames[frames.length > 1 && reduced ? 1 : 0])
      return
    }
    t0.current = performance.now()
    const seq = [...frames, frames[0]]
    const seg = period / frames.length
    let last = performance.now()
    const loop = (now: number) => {
      // While paused, shift the start time by exactly the elapsed frame time (freezes the pose).
      if (paused) t0.current += now - last
      last = now
      if (!paused) {
        const el = ((((now - t0.current) / 1000) % period) + period) % period
        const i = Math.max(0, Math.min(frames.length - 1, Math.floor(el / seg)))
        const local = (el - i * seg) / seg
        const moveFrac = 1 - hold
        const tt = local < hold / 2 ? 0 : local > hold / 2 + moveFrac ? 1 : (local - hold / 2) / moveFrac
        setPose(lerpPose(seq[i], seq[i + 1], ease(tt)))
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framesKey, period, hold, paused, reduced])
  return <>{render(pose)}</>
}

const rad = (d: number) => (d * Math.PI) / 180
const step = (p: { x: number; y: number }, ang: number, len: number) => ({ x: p.x + Math.cos(rad(ang)) * len, y: p.y + Math.sin(rad(ang)) * len })

/* ------------------------------------------------------------------ */
/* Full body – side view                                               */
/* ------------------------------------------------------------------ */

/**
 * Side-view body. Angles are absolute, in degrees: 0 = right, 90 = down, −90 = up.
 * Keys: x,y (pelvis), s1,s2 (lower/upper spine), n (neck), h (face direction),
 * aN1,aN2 / aF1,aF2 (near/far arm: upper, fore), lN1,lN2,lN3 / lF1,lF2,lF3 (near/far leg: thigh, shin, foot).
 */
export const STAND: Pose = { sc: 0.8, x: 100, y: 82, s1: -90, s2: -90, n: -90, h: 0, aN1: 95, aN2: 90, aF1: 85, aF2: 90, lN1: 92, lN2: 90, lN3: 0, lF1: 88, lF2: 90, lF3: 0 }

export function BodySide({ p, floor = true, mat = false, props }: { p: Pose; floor?: boolean; mat?: boolean; props?: ReactNode }) {
  const pelvis = { x: p.x, y: p.y }
  const mid = step(pelvis, p.s1, 30)
  const chest = step(mid, p.s2, 30)
  const neck = step(chest, p.n, 9)
  const head = step(neck, p.n, 12)
  const nose = step(head, p.h, 13)
  const limb = (from: { x: number; y: number }, a1: number, a2: number, l1: number, l2: number, a3?: number, l3?: number) => {
    const j1 = step(from, a1, l1)
    const j2 = step(j1, a2, l2)
    const j3 = a3 !== undefined && l3 ? step(j2, a3, l3) : null
    return `M${from.x},${from.y} L${j1.x},${j1.y} L${j2.x},${j2.y}${j3 ? ` L${j3.x},${j3.y}` : ''}`
  }
  const spine = `M${pelvis.x},${pelvis.y} Q${mid.x},${mid.y} ${chest.x},${chest.y}`
  return (
    <svg viewBox="0 0 200 170" className="h-full w-full" role="img" aria-hidden>
      {mat && <rect x="8" y="150" width="184" height="7" rx="3.5" fill="var(--accent-soft)" />}
      {floor && <line x1="4" y1="157" x2="196" y2="157" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />}
      {props}
      <g transform={`translate(100 157) scale(${p.sc ?? 1}) translate(-100 -157)`}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* far limbs */}
        <path d={limb(chest, p.aF1, p.aF2, 25, 23)} stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={8} />
        <path d={limb(pelvis, p.lF1, p.lF2, 36, 35, p.lF3, 10)} stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={9} />
        {/* torso */}
        <path d={spine} stroke="var(--accent)" strokeWidth={15} />
        <line x1={chest.x} y1={chest.y} x2={neck.x} y2={neck.y} stroke="var(--accent)" strokeWidth={8} />
        {/* near limbs */}
        <path d={limb(pelvis, p.lN1, p.lN2, 36, 35, p.lN3, 10)} stroke="var(--accent)" strokeWidth={9.5} />
        <path d={limb(chest, p.aN1, p.aN2, 25, 23)} stroke="var(--accent)" strokeWidth={8} />
      </g>
      <circle cx={head.x} cy={head.y} r={11.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth={4} />
      <circle cx={(head.x + nose.x * 0.6) / 1.6} cy={(head.y + nose.y * 0.6) / 1.6} r={2.4} fill="var(--accent)" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Head & shoulders – front view (neck exercises)                      */
/* ------------------------------------------------------------------ */

/** Keys: tilt (deg, + = head to viewer's right), turn (−1…1), nod (−1 up … 1 down), shrug (0…1), roll (0…1 shoulder circle phase), armsUp (0…1) */
export function HeadFront({ p }: { p: Pose }) {
  const tilt = p.tilt ?? 0
  const turn = p.turn ?? 0
  const nod = p.nod ?? 0
  const shrug = (p.shrug ?? 0) * 9
  const roll = p.roll ?? -1
  const rollDy = roll >= 0 ? Math.sin(roll * 2 * Math.PI) * 6 : 0
  const rollDx = roll >= 0 ? Math.cos(roll * 2 * Math.PI) * 3 : 0
  const sy = 118 - shrug - rollDy
  const blade = p.blade ?? 0 // shoulder-blade squeeze: shoulders move back (narrower in front view)
  const sw = 50 - blade * 6
  const cx = 100
  const neckTop = { x: cx, y: 88 }
  const hc = { x: cx + Math.sin(rad(tilt)) * 32, y: neckTop.y - Math.cos(rad(tilt)) * 30 + nod * 3 }
  const faceX = turn * 12
  const faceY = nod * 7
  return (
    <svg viewBox="0 0 200 170" className="h-full w-full" aria-hidden>
      <path
        d={`M${cx - sw - 10 + rollDx},170 Q${cx - sw - 6 + rollDx},${sy + 4} ${cx - sw / 2},${sy - 2} L${cx - 9},${sy - 10} L${cx + 9},${sy - 10} L${cx + sw / 2},${sy - 2} Q${cx + sw + 6 - rollDx},${sy + 4} ${cx + sw + 10 - rollDx},170 Z`}
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path d={`M${cx - 9},${sy - 8} L${cx - 9 + Math.sin(rad(tilt)) * 8},${neckTop.y - 4} M${cx + 9},${sy - 8} L${cx + 9 + Math.sin(rad(tilt)) * 8},${neckTop.y - 4}`} stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" />
      <g transform={`rotate(${tilt} ${hc.x} ${hc.y})`}>
        <ellipse cx={hc.x} cy={hc.y} rx={26 - Math.abs(turn) * 3} ry={31} fill="var(--surface)" stroke="var(--accent)" strokeWidth={4} />
        {/* ears */}
        <ellipse cx={hc.x - 26 + Math.max(0, turn) * 5} cy={hc.y + 2} rx={4} ry={7} fill="var(--surface)" stroke="var(--accent)" strokeWidth={3} opacity={turn > 0.6 ? 0.3 : 1} />
        <ellipse cx={hc.x + 26 + Math.min(0, turn) * 5} cy={hc.y + 2} rx={4} ry={7} fill="var(--surface)" stroke="var(--accent)" strokeWidth={3} opacity={turn < -0.6 ? 0.3 : 1} />
        {/* face */}
        <circle cx={hc.x - 9 + faceX} cy={hc.y - 4 + faceY} r={2.8} fill="var(--accent)" />
        <circle cx={hc.x + 9 + faceX} cy={hc.y - 4 + faceY} r={2.8} fill="var(--accent)" />
        <path d={`M${hc.x + faceX * 1.25},${hc.y + faceY} l${turn * 3},6`} stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
        <path d={`M${hc.x - 7 + faceX},${hc.y + 13 + faceY} q7,${4 - Math.abs(nod) * 2} 14,0`} stroke="var(--accent)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Head & neck – side view (chin tuck, flexion/extension)              */
/* ------------------------------------------------------------------ */

/** Keys: flex (deg, + = chin down), tuck (0…1 = head glides back) */
export function HeadSide({ p }: { p: Pose }) {
  const flex = p.flex ?? 0
  const tuck = (p.tuck ?? 0) * 10
  const base = { x: 92, y: 118 }
  const neckAng = -90 + flex * 0.5
  const top = step(base, neckAng, 24)
  const head = { x: top.x - tuck + Math.cos(rad(-90 + flex)) * 0 + 4, y: top.y - 22 + tuck * 0.2 }
  return (
    <svg viewBox="0 0 200 170" className="h-full w-full" aria-hidden>
      <path d="M40,170 Q46,120 86,112 L112,112 Q140,118 146,170 Z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={4} strokeLinejoin="round" />
      <line x1={base.x} y1={base.y - 4} x2={top.x - tuck * 0.6} y2={top.y} stroke="var(--accent)" strokeWidth={14} strokeLinecap="round" />
      <g transform={`rotate(${flex} ${head.x} ${head.y + 12})`}>
        <ellipse cx={head.x} cy={head.y} rx={24} ry={28} fill="var(--surface)" stroke="var(--accent)" strokeWidth={4} />
        <path d={`M${head.x + 22},${head.y - 4} l8,8 l-7,3`} fill="var(--surface)" stroke="var(--accent)" strokeWidth={3} strokeLinejoin="round" />
        <circle cx={head.x + 12} cy={head.y - 8} r={2.8} fill="var(--accent)" />
        <ellipse cx={head.x - 4} cy={head.y + 2} rx={4} ry={6.5} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
        <path d={`M${head.x + 10},${head.y + 16} l10,0`} stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
      </g>
      {tuck > 3 && <path d={`M${head.x + 40},${head.y} l-12,0 m4,-4 l-4,4 l4,4`} stroke="var(--muted)" strokeWidth={2} fill="none" strokeLinecap="round" />}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Hand – palm view                                                    */
/* ------------------------------------------------------------------ */

/**
 * Keys: c1..c4 (curl of index…little, 0 straight – 1 fist), spread (0…1),
 * tc (thumb curl 0…1), opp (thumb opposition target 0…4, 0 = none), lift (index of finger lifted, 0 = none)
 */
export function HandFront({ p, mirror }: { p: Pose; mirror?: boolean }) {
  const spread = p.spread ?? 0
  const curls = [p.c1 ?? 0, p.c2 ?? 0, p.c3 ?? 0, p.c4 ?? 0]
  const bases = [
    { x: 78, y: 82 },
    { x: 96, y: 76 },
    { x: 114, y: 80 },
    { x: 130, y: 90 },
  ]
  const lengths = [52, 58, 54, 42]
  const angles = [-100 - spread * 14, -92 - spread * 4, -84 + spread * 6, -76 + spread * 16]
  const tips = bases.map((b, i) => step(b, angles[i], lengths[i] * (1 - 0.78 * curls[i])))
  // thumb
  const tb = { x: 66, y: 128 }
  const oppIdx = Math.round(p.opp ?? 0)
  const opp = oppIdx > 0 ? tips[oppIdx - 1] : null
  const tc = p.tc ?? 0
  let tt = step(tb, -150 - spread * 12, 44 * (1 - 0.35 * tc))
  if (tc > 0) tt = { x: tt.x + tc * 34, y: tt.y + tc * 8 }
  if (opp) tt = { x: opp.x - 2, y: opp.y + 6 }
  const tm = { x: (tb.x + tt.x) / 2 - 6, y: (tb.y + tt.y) / 2 + 2 }
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M70,172 L72,192 L128,192 L130,172" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={4} strokeLinejoin="round" />
      <g fill="none" strokeLinecap="round" stroke="var(--accent)">
        {bases.map((b, i) => (
          <g key={i}>
            <line x1={b.x} y1={b.y + 6} x2={tips[i].x} y2={tips[i].y} strokeWidth={17} />
            <line x1={b.x} y1={b.y + 6} x2={tips[i].x} y2={tips[i].y} stroke="var(--surface)" strokeWidth={9} />
            {curls[i] > 0.45 && <circle cx={tips[i].x} cy={tips[i].y + 2} r={5} fill="var(--accent)" stroke="none" opacity={0.55} />}
          </g>
        ))}
      </g>
      <path d="M66,86 Q64,130 70,172 L130,172 Q140,130 138,96 Q120,78 96,76 Q76,76 66,86 Z" fill="var(--surface)" stroke="var(--accent)" strokeWidth={4} strokeLinejoin="round" />
      <path d="M84,128 Q100,140 120,126" stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <g fill="none" strokeLinecap="round" stroke="var(--accent)">
        <path d={`M${tb.x},${tb.y} Q${tm.x},${tm.y} ${tt.x},${tt.y}`} strokeWidth={18} />
        <path d={`M${tb.x},${tb.y} Q${tm.x},${tm.y} ${tt.x},${tt.y}`} stroke="var(--surface)" strokeWidth={10} />
      </g>
    </svg>
  )
}

/** Forearm & hand, side view. Keys: wrist (deg, + = flexion/down), dev (deg, radial/ulnar), fist (0…1) */
export function WristSide({ p }: { p: Pose }) {
  const w = p.wrist ?? 0
  const fist = p.fist ?? 0
  const wrist = { x: 110, y: 96 }
  const handEnd = step(wrist, w, 50 - fist * 22)
  return (
    <svg viewBox="0 0 200 170" className="h-full w-full" aria-hidden>
      <rect x="10" y="104" width="100" height="10" rx="5" fill="var(--surface-3)" />
      <line x1="22" y1="96" x2={wrist.x} y2={wrist.y} stroke="var(--accent)" strokeWidth={22} strokeLinecap="round" />
      <line x1="22" y1="96" x2={wrist.x} y2={wrist.y} stroke="var(--surface)" strokeWidth={13} strokeLinecap="round" />
      <line x1={wrist.x} y1={wrist.y} x2={handEnd.x} y2={handEnd.y} stroke="var(--accent)" strokeWidth={26 + fist * 6} strokeLinecap="round" />
      <line x1={wrist.x} y1={wrist.y} x2={handEnd.x} y2={handEnd.y} stroke="var(--surface)" strokeWidth={17 + fist * 6} strokeLinecap="round" />
      {w !== 0 && (
        <path
          d={`M${wrist.x + 34},${wrist.y + (w > 0 ? -22 : 22)} a36,36 0 0 ${w > 0 ? 1 : 0} ${w > 0 ? 8 : 8},${w > 0 ? 30 : -30}`}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={2}
          strokeDasharray="3 4"
        />
      )}
    </svg>
  )
}

/** Breathing / generic pulsing circle (for timed activities without a figure). */
export function PulseCircle({ p }: { p: Pose }) {
  const s = 0.6 + (p.s ?? 0) * 0.4
  return (
    <svg viewBox="0 0 200 170" className="h-full w-full" aria-hidden>
      <circle cx="100" cy="85" r={70 * s} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={4} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Full body – front view (side bends, trunk rotation)                 */
/* ------------------------------------------------------------------ */

/** Keys: bend (deg, + = trunk bends to viewer's right), twist (−1…1, trunk rotation), reach (0…1 arm slides down the leg) */
export function BodyFront({ p }: { p: Pose }) {
  const bend = p.bend ?? 0
  const twist = p.twist ?? 0
  const hip = { x: 100, y: 100 }
  const top = step(hip, -90 + bend, 44)
  const sw = 26 * (1 - Math.abs(twist) * 0.45)
  const perp = -90 + bend + 90
  const sL = step(top, perp + 180, sw / 2)
  const sR = step(top, perp, sw / 2)
  const neckTop = step(top, -90 + bend * 1.1, 10)
  const head = step(neckTop, -90 + bend * 1.15, 13)
  const reach = (p.reach ?? 0) * 18
  const armL = `M${sL.x},${sL.y} L${sL.x - 6 + (bend < 0 ? -reach * 0.3 : 0)},${sL.y + 26 + (bend < 0 ? reach : -reach * 0.3)} L${sL.x - 5 + (bend < 0 ? -reach * 0.4 : 0)},${sL.y + 50 + (bend < 0 ? reach : -reach * 0.5)}`
  const armR = `M${sR.x},${sR.y} L${sR.x + 6 + (bend > 0 ? reach * 0.3 : 0)},${sR.y + 26 + (bend > 0 ? reach : -reach * 0.3)} L${sR.x + 5 + (bend > 0 ? reach * 0.4 : 0)},${sR.y + 50 + (bend > 0 ? reach : -reach * 0.5)}`
  return (
    <svg viewBox="0 0 200 170" className="h-full w-full" aria-hidden>
      <line x1="30" y1="160" x2="170" y2="160" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />
      <g fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${hip.x - 9},${hip.y} L${hip.x - 12},${hip.y + 30} L${hip.x - 13},158`} strokeWidth={10} />
        <path d={`M${hip.x + 9},${hip.y} L${hip.x + 12},${hip.y + 30} L${hip.x + 13},158`} strokeWidth={10} />
        <path d={`M${hip.x - 11},${hip.y} Q${(hip.x + top.x) / 2 - bend * 0.25},${(hip.y + top.y) / 2} ${sL.x},${sL.y} L${sR.x},${sR.y} Q${(hip.x + top.x) / 2 - bend * 0.25 + 4},${(hip.y + top.y) / 2} ${hip.x + 11},${hip.y} Z`} fill="var(--accent-soft)" strokeWidth={4} />
        <path d={armL} strokeWidth={8} strokeOpacity={twist > 0.3 ? 0.4 : 1} />
        <path d={armR} strokeWidth={8} strokeOpacity={twist < -0.3 ? 0.4 : 1} />
        <line x1={top.x} y1={top.y} x2={neckTop.x} y2={neckTop.y} strokeWidth={8} />
      </g>
      <circle cx={head.x} cy={head.y} r={12} fill="var(--surface)" stroke="var(--accent)" strokeWidth={4} />
      <circle cx={head.x - 4 + twist * 6} cy={head.y - 2} r={1.8} fill="var(--accent)" />
      <circle cx={head.x + 4 + twist * 6} cy={head.y - 2} r={1.8} fill="var(--accent)" />
    </svg>
  )
}
