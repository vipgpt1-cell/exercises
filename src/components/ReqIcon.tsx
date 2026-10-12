import { Armchair, Hand, Headphones, Keyboard, Maximize, Smartphone, Volume2, VolumeX } from 'lucide-react'
import type { Requirement } from '../catalog/types'

const MAP = {
  headphones: Headphones,
  quiet: VolumeX,
  phone: Smartphone,
  touch: Hand,
  sound: Volume2,
  keyboard: Keyboard,
  seated: Armchair,
  space: Maximize,
} satisfies Record<Requirement, unknown>

export function ReqIcon({ r, className }: { r: Requirement; className?: string }) {
  const I = MAP[r]
  return <I className={className} aria-hidden />
}
