import { Bot, Focus, Inbox, Vault } from 'lucide-react'
import { InboxDeck } from './inbox/InboxDeck'
import { FocusList } from './focus/FocusList'
import { VaultSpace } from './vault/VaultSpace'
import { AgentLab } from './agents/AgentLab'

export const VIEW_REGISTRY = {
  inbox: { component: InboxDeck, name: 'Входящие', icon: Inbox },
  focus: { component: FocusList, name: 'Фокус', icon: Focus },
  vault: { component: VaultSpace, name: 'Хранилище', icon: Vault },
  agents: { component: AgentLab, name: 'Agent Lab', icon: Bot },
} as const

export type ViewType = keyof typeof VIEW_REGISTRY
