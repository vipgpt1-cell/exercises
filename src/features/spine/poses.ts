import { STAND, type Pose } from '../../components/routine/figures'

/** Lying on the back, knees bent (hook lying). Head on the left. */
export const SUPINE_HOOK: Pose = { x: 112, y: 146, s1: 180, s2: 180, n: 180, h: -90, aN1: 8, aN2: 0, aF1: 4, aF2: 0, lN1: -55, lN2: 55, lN3: 0, lF1: -58, lF2: 58, lF3: 0 }
export const KNEE_TO_CHEST: Pose = { ...SUPINE_HOOK, lN1: -125, lN2: -5, lN3: -30, aN1: -40, aN2: -10 }
export const BRIDGE: Pose = { ...SUPINE_HOOK, x: 108, y: 122, s1: 158, s2: 158, n: 180, aN1: 12, aF1: 10, lN1: -20, lN2: 74, lF1: -23, lF2: 77 }

/** On hands and knees, head on the left. */
export const QUAD: Pose = { x: 135, y: 112, s1: 186, s2: 186, n: 195, h: 180, aN1: 90, aN2: 90, aF1: 92, aF2: 90, lN1: 90, lN2: 0, lN3: 20, lF1: 92, lF2: 0, lF3: 20 }
export const CAT: Pose = { ...QUAD, s1: 204, s2: 170, n: 120, h: 110 }
export const COW: Pose = { ...QUAD, s1: 172, s2: 200, n: 218, h: 200 }
export const BIRD_DOG: Pose = { ...QUAD, aN1: 184, aN2: 184, lF1: -4, lF2: 0, lF3: 60 }
export const CHILD: Pose = { x: 140, y: 128, s1: 160, s2: 180, n: 170, h: 150, aN1: 160, aN2: 180, aF1: 162, aF2: 180, lN1: 145, lN2: 0, lN3: 0, lF1: 147, lF2: 0, lF3: 0 }

/** Lying face down. */
export const PRONE: Pose = { x: 112, y: 148, s1: 180, s2: 180, n: 180, h: 110, aN1: -40, aN2: 135, aF1: -38, aF2: 138, lN1: 0, lN2: 0, lN3: 60, lF1: 2, lF2: 0, lF3: 60 }
export const PRESS_UP: Pose = { ...PRONE, s1: 205, s2: 235, n: 240, h: 200, aN1: 90, aN2: 90, aF1: 92, aF2: 92 }

export const STAND_HANDS_HIPS: Pose = { ...STAND, aN1: 115, aN2: -20, aF1: 112, aF2: -15 }
export const STAND_EXTENSION: Pose = { ...STAND_HANDS_HIPS, s1: -96, s2: -112, n: -118, h: -25, x: 104 }
export const STAND_REACH_UP: Pose = { ...STAND, aN1: -95, aN2: -95, aF1: -85, aF2: -85 }
export { STAND }
