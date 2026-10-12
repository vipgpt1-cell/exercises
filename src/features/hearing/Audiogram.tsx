import { useElementSize } from '../../lib/hooks'
import { AUDIOGRAM_FREQS, type EarMap } from './audiometry'

const Y_MIN = -10
const Y_MAX = 100

const fLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f))

export function Audiogram({
  right,
  left,
  ageLine,
  labels,
}: {
  right?: EarMap
  left?: EarMap
  ageLine?: { freq: number; hl: number }[]
  labels: { right: string; left: string; age: string; normal: string; freq: string }
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const W = Math.max(280, width)
  const H = Math.round(Math.min(360, Math.max(260, W * 0.62)))
  const pad = { l: 40, r: 14, t: 28, b: 14 }
  const logMin = Math.log2(250 / 1.3)
  const logMax = Math.log2(8000 * 1.3)
  const X = (f: number) => pad.l + ((Math.log2(f) - logMin) / (logMax - logMin)) * (W - pad.l - pad.r)
  const Y = (hl: number) => pad.t + ((hl - Y_MIN) / (Y_MAX - Y_MIN)) * (H - pad.t - pad.b)
  const yTicks = Array.from({ length: (Y_MAX - Y_MIN) / 10 + 1 }, (_, i) => Y_MIN + i * 10)

  const series = (ear: EarMap | undefined) =>
    AUDIOGRAM_FREQS.filter((f) => ear?.[String(f)]).map((f) => {
      const t = ear![String(f)]
      return { f, hl: t.hl ?? t.max, nr: t.hl === null }
    })
  const R = series(right)
  const L = series(left)
  const path = (pts: { f?: number; freq?: number; hl: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X((p.f ?? p.freq)!).toFixed(1)},${Y(p.hl).toFixed(1)}`).join(' ')

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label="Audiogram" className="block">
          {/* normal zone */}
          <rect x={pad.l} y={Y(Y_MIN)} width={W - pad.l - pad.r} height={Y(20) - Y(Y_MIN)} fill="var(--great-soft)" />
          <text x={W - pad.r - 6} y={Y(15)} textAnchor="end" fontSize="10.5" fill="var(--great)" fontWeight={600}>
            {labels.normal}
          </text>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--border)" strokeWidth={v === 0 ? 1.5 : 1} />
              <text x={pad.l - 6} y={Y(v)} textAnchor="end" dominantBaseline="middle" fontSize="10.5" fill="var(--muted)">
                {v}
              </text>
            </g>
          ))}
          {AUDIOGRAM_FREQS.map((f) => (
            <g key={f}>
              <line x1={X(f)} x2={X(f)} y1={pad.t} y2={H - pad.b} stroke="var(--border)" strokeDasharray={f === 3000 || f === 6000 ? '2 4' : undefined} />
              <text x={X(f)} y={pad.t - 10} textAnchor="middle" fontSize="11" fill="var(--muted)" fontWeight={500}>
                {fLabel(f)}
              </text>
            </g>
          ))}
          <text x={4} y={pad.t - 10} fontSize="10" fill="var(--muted)">
            dB HL
          </text>

          {ageLine && ageLine.length > 1 && (
            <g>
              <path d={path(ageLine)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 5" opacity={0.8} />
              <text x={X(ageLine[ageLine.length - 1].freq) - 4} y={Y(ageLine[ageLine.length - 1].hl) - 7} textAnchor="end" fontSize="10" fill="var(--muted)">
                {labels.age}
              </text>
            </g>
          )}

          {R.length > 1 && <path d={path(R)} fill="none" stroke="var(--ear-right)" strokeWidth={2.2} />}
          {L.length > 1 && <path d={path(L)} fill="none" stroke="var(--ear-left)" strokeWidth={2.2} strokeDasharray="6 4" />}
          {R.map((p) => (
            <g key={'r' + p.f}>
              <circle cx={X(p.f)} cy={Y(p.hl)} r={6.5} fill="var(--surface)" stroke="var(--ear-right)" strokeWidth={2.5} />
              {p.nr && <NoResponse x={X(p.f) - 7} y={Y(p.hl) + 7} color="var(--ear-right)" dir={-1} />}
            </g>
          ))}
          {L.map((p) => (
            <g key={'l' + p.f} stroke="var(--ear-left)" strokeWidth={2.6} strokeLinecap="round">
              <line x1={X(p.f) - 6} y1={Y(p.hl) - 6} x2={X(p.f) + 6} y2={Y(p.hl) + 6} />
              <line x1={X(p.f) - 6} y1={Y(p.hl) + 6} x2={X(p.f) + 6} y2={Y(p.hl) - 6} />
              {p.nr && <NoResponse x={X(p.f) + 7} y={Y(p.hl) + 7} color="var(--ear-left)" dir={1} />}
            </g>
          ))}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="16">
            <circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--ear-right)" strokeWidth="2.4" />
          </svg>
          {labels.right}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="16" stroke="var(--ear-left)" strokeWidth="2.4" strokeLinecap="round">
            <line x1="3" y1="3" x2="13" y2="13" />
            <line x1="3" y1="13" x2="13" y2="3" />
          </svg>
          {labels.left}
        </span>
        {ageLine && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="10">
              <line x1="1" y1="5" x2="21" y2="5" stroke="var(--muted)" strokeWidth="1.6" strokeDasharray="4 3" />
            </svg>
            {labels.age}
          </span>
        )}
        <span className="text-muted">↓ = {labels.freq}</span>
      </div>
    </div>
  )
}

function NoResponse({ x, y, color, dir }: { x: number; y: number; color: string; dir: 1 | -1 }) {
  return <path d={`M${x},${y} l${dir * 7},10 m-${dir * 7},-10 l${dir * 1},6 m${-dir * 1},-6 l${dir * 5},2`} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
}
