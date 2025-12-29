import { Focus, Layers, Vault } from 'lucide-react'
import { InboxDeck } from './inbox/InboxDeck'
import { FocusList } from './focus/FocusList'
import { VaultSpace } from './vault/VaultSpace'

export const VIEW_REGISTRY = {
  inbox: { component: InboxDeck, name: 'Входящие', icon: Layers },
  focus: { component: FocusList, name: 'Фокус', icon: Focus },
  vault: { component: VaultSpace, name: 'Хранилище', icon: Vault },
} as const

export type ViewType = keyof typeof VIEW_REGISTRY
