import type { AnyTest, ExerciseModule, FieldId } from './types'

import toneTest from '../features/hearing/tone-test'
import dinTest from '../features/hearing/din-test'
import balanceTest from '../features/hearing/balance-test'
import rangeTest from '../features/hearing/range-test'
import pitchTraining from '../features/hearing/pitch-training'
import noiseTraining from '../features/hearing/noise-training'

import reactionTest from '../features/cognitive/reaction-test'
import digitSpanTest from '../features/cognitive/digit-span'
import corsiTest from '../features/cognitive/corsi'
import stroopTest from '../features/cognitive/stroop'
import trailTest from '../features/cognitive/trail-making'
import goNoGoTest from '../features/cognitive/go-nogo'
import schulte from '../features/cognitive/schulte'
import nback from '../features/cognitive/nback'
import pairs from '../features/cognitive/pairs'

import tappingTest from '../features/motor/tapping'
import spiralTest from '../features/motor/spiral'
import aimingTest from '../features/motor/aiming'
import tremorTest from '../features/motor/tremor'
import handRoutine from '../features/motor/hand-routine'
import tracingPractice from '../features/motor/tracing-practice'
import targetPractice from '../features/motor/target-practice'

import painCheck from '../features/spine/pain-check'
import functionTest from '../features/spine/function-test'
import mobilityCheck from '../features/spine/mobility-check'
import boltTest from '../features/spine/bolt-test'
import breathRate from '../features/spine/breath-rate'
import breathing from '../features/spine/breathing'
import neckRoutine from '../features/spine/neck-routine'
import backRoutine from '../features/spine/back-routine'
import deskBreak from '../features/spine/desk-break'

export const TESTS: AnyTest[] = [
  toneTest,
  dinTest,
  balanceTest,
  rangeTest,
  reactionTest,
  digitSpanTest,
  corsiTest,
  stroopTest,
  trailTest,
  goNoGoTest,
  tappingTest,
  spiralTest,
  aimingTest,
  tremorTest,
  painCheck,
  functionTest,
  mobilityCheck,
  boltTest,
  breathRate,
]

export const EXERCISES: ExerciseModule[] = [
  pitchTraining,
  noiseTraining,
  schulte,
  nback,
  pairs,
  handRoutine,
  tracingPractice,
  targetPractice,
  breathing,
  neckRoutine,
  backRoutine,
  deskBreak,
]

export const testById = (id: string) => TESTS.find((t) => t.id === id)
export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)
export const testsOf = (f: FieldId) => TESTS.filter((t) => t.field === f)
export const exercisesOf = (f: FieldId) => EXERCISES.filter((e) => e.field === f)
