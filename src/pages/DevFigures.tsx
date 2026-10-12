import { BodySide, HandFront, HeadFront, HeadSide, PulseCircle, WristSide } from '../components/routine/figures'
import type { RoutineStep } from '../components/routine/RoutinePlayer'
import { handSteps } from '../features/motor/hand-routine'
import { neckSteps } from '../features/spine/neck-routine'
import { backSteps } from '../features/spine/back-routine'
import { deskSteps } from '../features/spine/desk-break'

/** Development-only: renders every key pose of every routine for visual review. */
const groups: [string, (lang: 'en') => RoutineStep[]][] = [['back', backSteps], ['neck', neckSteps], ['desk', deskSteps], ['hand', handSteps]]
export function registerDevRoutine(name: string, fn: (lang: 'en') => RoutineStep[]) {
  if (!groups.find((g) => g[0] === name)) groups.push([name, fn])
}

export function DevFigures() {
  return (
    <div className="accent-spine min-h-dvh bg-bg p-4">
      {groups.map(([g, fn]) => (
        <div key={g} className="mb-6">
          <h2 className="mb-2 text-lg font-bold">{g}</h2>
          <div className="grid grid-cols-4 gap-2">
            {fn('en').flatMap((s) =>
              s.figure.frames.map((f, i) => (
                <div key={s.id + i} className="rounded-xl bg-surface p-1">
                  <div className="aspect-[200/170]">
                    {s.figure.kind === 'body' ? <BodySide p={f} mat={s.figure.mat} /> : s.figure.kind === 'headFront' ? <HeadFront p={f} /> : s.figure.kind === 'headSide' ? <HeadSide p={f} /> : s.figure.kind === 'hand' ? <HandFront p={f} /> : s.figure.kind === 'wrist' ? <WristSide p={f} /> : <PulseCircle p={f} />}
                  </div>
                  <div className="truncate text-[10px]">
                    {s.id} #{i}
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
