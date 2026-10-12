import { Hand } from 'lucide-react'
import { Stage } from '../../components/shell'
import { Button, cx } from '../../components/ui'
import { defineStrings, useStrings, type Lang } from '../../lib/i18n'
import { updatePerson } from '../../lib/store'
import { common } from '../../i18n/common'

export type Side = 'right' | 'left'

export const handStrings = defineStrings({
  en: {
    whichHand: 'Which is your main hand?',
    whichHandText: 'The hand you write with. We’ll remember it for next time.',
    useHand: (h: string) => `Use your ${h}`,
    right: 'right hand',
    left: 'left hand',
    rightCap: 'Right hand',
    leftCap: 'Left hand',
    dominant: 'main hand',
    nonDominant: 'other hand',
  },
  uz: {
    whichHand: 'Qaysi qo‘lingiz asosiy?',
    whichHandText: 'Yozadigan qo‘lingiz. Keyingi safar uchun eslab qolamiz.',
    useHand: (h: string) => `${h} qo‘lingiz bilan bajaring`,
    right: 'O‘ng',
    left: 'Chap',
    rightCap: 'O‘ng qo‘l',
    leftCap: 'Chap qo‘l',
    dominant: 'asosiy qo‘l',
    nonDominant: 'ikkinchi qo‘l',
  },
  ru: {
    whichHand: 'Какая рука у вас ведущая?',
    whichHandText: 'Та, которой вы пишете. Мы запомним это на следующий раз.',
    useHand: (h: string) => `Выполняйте ${h}`,
    right: 'правой рукой',
    left: 'левой рукой',
    rightCap: 'Правая рука',
    leftCap: 'Левая рука',
    dominant: 'ведущая',
    nonDominant: 'неведущая',
  },
})

export const handName = (lang: Lang, side: Side) => (side === 'right' ? handStrings[lang].rightCap : handStrings[lang].leftCap)

export function HandPicker({ onPick }: { onPick: (s: Side) => void }) {
  const h = useStrings(handStrings)
  return (
    <Stage icon={<Hand className="h-8 w-8" />} title={h.whichHand}>
      <p>{h.whichHandText}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {(['left', 'right'] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              updatePerson({ hand: s })
              onPick(s)
            }}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-line bg-surface p-5 font-bold text-ink transition hover:border-[var(--accent)]"
          >
            <Hand className={cx('h-10 w-10 text-[var(--accent)]', s === 'left' && '-scale-x-100')} />
            {s === 'right' ? h.rightCap : h.leftCap}
          </button>
        ))}
      </div>
    </Stage>
  )
}

/** "Use your right hand" card shown before each hand's trial. */
export function UseHand({ side, dominant, onGo, extra }: { side: Side; dominant: boolean; onGo: () => void; extra?: string }) {
  const h = useStrings(handStrings)
  const t = useStrings(common)
  return (
    <Stage
      icon={<Hand className={cx('h-9 w-9', side === 'left' && '-scale-x-100')} />}
      title={h.useHand(side === 'right' ? h.right : h.left)}
      footer={
        <Button variant="accent" size="lg" onClick={onGo}>
          {t.btn.start}
        </Button>
      }
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">({dominant ? h.dominant : h.nonDominant})</p>
      {extra && <p className="mt-3">{extra}</p>}
    </Stage>
  )
}
