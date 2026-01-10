import {
  Focus,
  Folders,
  Inbox,
  MapPinned,
  Users2,
  Vault,
} from 'lucide-react'
import { InboxDeck } from './inbox/InboxDeck'
import { FocusList } from './focus/FocusList'
import { VaultSpace } from './vault/VaultSpace'
import { AgentLab } from './agents/AgentLab'
import { ProjectHub } from './hub/ProjectHub'
import { ProjectView } from './project/ProjectView'

export const VIEW_REGISTRY = {
  inbox: { component: InboxDeck, name: 'Входящие', icon: Inbox },
  focus: { component: FocusList, name: 'Фокус', icon: Focus },
  vault: { component: VaultSpace, name: 'Хранилище', icon: Vault },
  agents: { component: AgentLab, name: 'Агенты', icon: Users2 },
  project: { component: ProjectView, name: 'Главная Проекта', icon: MapPinned },
  hub: { component: ProjectHub, name: 'Хаб Проектов', icon: Folders },
} as const

export type ViewType = keyof typeof VIEW_REGISTRY
