import { Layers, Star } from 'lucide-react'
import { InboxDeck } from './inbox/InboxDeck'
import { FocusList } from './focus/FocusList'
// import { EisenhowerMatrix } from './matrix/EisenhowerMatrix.tsx'

export const VIEW_REGISTRY = {
  inbox: { component: InboxDeck, name: 'Инбокс', icon: Layers },
  focus: { component: FocusList, name: 'Фокус', icon: Star },
  // matrix: { component: EisenhowerMatrix, name: 'Матрица', icon: LayoutGrid },
} as const

export type ViewType = keyof typeof VIEW_REGISTRY
