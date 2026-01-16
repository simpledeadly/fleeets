import { create } from 'zustand'
import type { Database } from '@/types/supabase'

export type Agent = Database['public']['Tables']['agents']['Row']

interface AgentsState {
  agents: Agent[]
  isLoading: boolean
  isInitialized: boolean
  selectedAgentId: string | null
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  updateAgent: (agent: Agent) => void
  removeAgent: (agentId: string) => void
  setSelectedAgentId: (id: string | null) => void
  proposedChanges: any[] | null
  setProposedChanges: (changes: any[] | null) => void
  contextFields: string[]
  setContextFields: (fields: string[]) => void
}

export const useAgentsStore = create<AgentsState>((set) => ({
  agents: [],
  isLoading: true,
  isInitialized: false,
  selectedAgentId: null,
  proposedChanges: null,
  contextFields: ['content', 'description', 'status', 'type'],
  setAgents: (agents) => set({ agents, isLoading: false, isInitialized: true }),
  addAgent: (newAgent) =>
    set((state) => ({ agents: [newAgent, ...state.agents] })),
  updateAgent: (updatedAgent) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === updatedAgent.id ? updatedAgent : a
      ),
    })),
  removeAgent: (agentId) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== agentId),
      selectedAgentId:
        state.selectedAgentId === agentId ? null : state.selectedAgentId,
    })),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setProposedChanges: (changes) => set({ proposedChanges: changes }),
  setContextFields: (fields) => set({ contextFields: fields }),
}))
