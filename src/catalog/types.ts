import type { FC } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Lang, Strings } from '../lib/i18n'
import type { ExerciseLog, StoredResult, Summary } from '../lib/store'
import type { common } from '../i18n/common'

export type FieldId = 'hearing' | 'memory' | 'hands' | 'spine'
export type Requirement = keyof (typeof common)['en']['req']

export interface InfoStrings {
  name: string
  /** One line shown on cards. */
  short: string
  /** What the test measures (paragraph). */
  measures: string
  /** How it works – numbered steps. */
  steps: string[]
  /** Tips for accurate results. */
  tips: string[]
  /** Optional safety / caution notes. */
  caution?: string[]
}

export interface RunnerProps<D> {
  onDone: (summary: Summary, data: D) => void
  onExit: () => void
}

export interface Headline {
  value: string
  unit?: string
  /** Short interpretation label (defaults to the generic level label). */
  label?: string
}

export interface TestModule<D = unknown> {
  kind: 'test'
  id: string
  field: FieldId
  icon: LucideIcon
  minutes: number
  requirements: Requirement[]
  /** Bump when scoring changes; stored with each result. */
  version: number
  info: Strings<InfoStrings>
  Runner: FC<RunnerProps<D>>
  Details: FC<{ result: StoredResult<D> }>
  headline: (r: StoredResult<D>, lang: Lang) => Headline
  /** How to plot `summary.value` over time. */
  trend?: { higherIsBetter: boolean; unit: (lang: Lang) => string; digits: number }
  /** Optional capability check (e.g. motion sensors). */
  supported?: () => boolean
  /** Scored against age norms: the intro asks for the age if it is not known yet. */
  usesAge?: boolean
}

export interface ExerciseRunnerProps {
  onDone: (log: Omit<ExerciseLog, 'id' | 'date' | 'exerciseId'>) => void
  onExit: () => void
}

export interface ExerciseModule {
  kind: 'exercise'
  id: string
  field: FieldId
  icon: LucideIcon
  minutes: number
  requirements: Requirement[]
  info: Strings<InfoStrings>
  Runner: FC<ExerciseRunnerProps>
  /** Rows for the completion screen and history. */
  describe?: (log: Pick<ExerciseLog, 'seconds' | 'score' | 'detail'>, lang: Lang) => { label: string; value: string }[]
}

// Modules are heterogeneous in their data type; the registry stores them loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTest = TestModule<any>
