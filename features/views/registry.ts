import { Bot, Focus, Inbox, MapPinned, Vault } from 'lucide-react'
import { InboxDeck } from './inbox/InboxDeck'
import { FocusList } from './focus/FocusList'
import { VaultSpace } from './vault/VaultSpace'
import { AgentLab } from './agents/AgentLab'
import { ScopeView } from '@/features/scopes'

export const VIEW_REGISTRY = {
  inbox: { component: InboxDeck, name: 'Входящие', icon: Inbox },
  focus: { component: FocusList, name: 'Фокус', icon: Focus },
  vault: { component: VaultSpace, name: 'Хранилище', icon: Vault },
  agents: { component: AgentLab, name: 'Agent Lab', icon: Bot },
  project: { component: ScopeView, name: 'Home', icon: MapPinned },
} as const

export type ViewType = keyof typeof VIEW_REGISTRY
