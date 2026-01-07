'use client'

import { useState } from 'react'
import { useAgent, useAgentsStore, type Agent } from '@/features/agents'
import { upsertAgent, deleteAgent } from '@/features/agents/model/actions'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Bot,
  Settings2,
  Save,
  Cpu,
  Wrench,
  FolderKanban,
  Globe,
  ShieldCheck,
  Terminal,
  Loader2,
  Play,
} from 'lucide-react'

const MODELS_CONFIG = {
  google: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
    { id: 'x-ai/grok-4', name: 'Grok 4' },
  ],
}

const AVAILABLE_TOOLS = [
  { id: 'database:CREATE_ITEMS', name: 'Создание элементов', category: 'DB' },
  { id: 'database:UPDATE_ITEM', name: 'Обновление элементов', category: 'DB' },
  { id: 'ui:DECOMPOSITION_TREE', name: 'Дерево декомпозиции', category: 'UI' },
]

export function AgentLab() {
  const { agents, addAgent, updateAgent, removeAgent } = useAgentsStore()
  const { runAgent } = useAgent()

  const [selectedAgent, setSelectedAgent] = useState<Partial<Agent> | null>(
    null
  )
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)

  const getSettings = () => {
    const defaultSettings = {
      provider: 'google',
      model: 'gemini-2.5-flash',
      temperature: 1,
      permissions: {
        user_manifesto: true,
        project_manifesto: true,
        tools: [],
      },
    }
    if (!selectedAgent?.model_settings) return defaultSettings
    return selectedAgent.model_settings as any
  }

  const settings = getSettings()
  const permissions = settings.permissions || {
    user_manifesto: true,
    project_manifesto: true,
    tools: [],
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgent) return

    const toastId = toast.loading('Сохранение агента...')
    try {
      const res = await upsertAgent(selectedAgent)
      const exists = agents.some((a) => a.id === res.id)
      if (exists) updateAgent(res)
      else addAgent(res)

      toast.success('Агент готов к работе', { id: toastId })
      setSelectedAgent(null)
    } catch (e) {
      toast.error(`Ошибка сохранения: ${e}`, { id: toastId })
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSelectedAgent({
      ...selectedAgent,
      model_settings: { ...settings, [key]: value },
    })
  }

  const togglePermission = (key: 'user_manifesto' | 'project_manifesto') => {
    updateSetting('permissions', {
      ...permissions,
      [key]: !permissions[key],
    })
  }

  const toggleTool = (toolId: string) => {
    const currentTools = permissions.tools || []
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((t: string) => t !== toolId)
      : [...currentTools, toolId]

    updateSetting('permissions', {
      ...permissions,
      tools: newTools,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить агента?')) return
    try {
      await deleteAgent(id)
      removeAgent(id)
      toast.success('Агент уволен')
    } catch (e) {
      toast.error(`Не удалось удалить: ${e}`)
    }
  }

  return (
    <div className="flex h-screen max-h-screen w-full gap-0 overflow-hidden bg-card">
      {/* Список Агентов */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold tracking-tight">Агенты</h1>
          <button
            onClick={() =>
              setSelectedAgent({
                name: 'Новый агент',
                system_prompt: '',
                color: '#3B82F6',
                model_settings: {
                  provider: 'google',
                  model: 'gemini-2.5-flash',
                  temperature: 1,
                  permissions: {
                    user_manifesto: true,
                    project_manifesto: true,
                    tools: [],
                  },
                },
              })
            }
            className="flex items-center font-medium gap-1 px-2 py-1.5 bg-muted hover:bg-muted-foreground/15 border border-border rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Plus size={18} /> Нанять Агента
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`py-2.5 px-3 rounded-lg bg-card border transition-all group cursor-pointer ${
                  selectedAgent?.id === agent.id
                    ? 'border-border shadow-xl'
                    : 'border-border hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: agent.color || '#fff' }}
                    >
                      <Bot size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-semibold ">{agent.name}</h3>
                      <span className="text-[12px] uppercase tracking-wide text-muted-foreground font-semibold">
                        {(agent.model_settings as any)?.provider} /{' '}
                        {(agent.model_settings as any)?.model}
                      </span>
                    </div>
                  </div>
                  {!agent.is_system && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(agent.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {agent.system_prompt || (
                    <span className="italic opacity-30">
                      Нет системного промпта...
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Редактор */}
      {selectedAgent && (
        <div className="w-110 bg-card border-l border-border flex flex-col min-h-0 z-20">
          <div className="py-2 px-3 flex items-center justify-between shrink-0 border-b border-border">
            <h2 className="text-lg font-bold tracking-tighter flex items-center gap-2">
              <Settings2 size={20} /> Конфигурация
            </h2>
            <button
              onClick={() => setSelectedAgent(null)}
              className="flex items-center font-medium gap-1 px-2 py-1.5 bg-muted hover:bg-muted-foreground/15 border border-border rounded-lg transition-colors text-sm cursor-pointer"
            >
              Закрыть
            </button>
          </div>

          <form
            onSubmit={handleSave}
            className="flex-1 overflow-y-auto px-4 py-2 space-y-4 custom-scrollbar"
          >
            <div className="grid grid-cols-4 gap-4 mt-1">
              <div className="col-span-3">
                <label className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
                  Публичное имя
                </label>
                <input
                  value={selectedAgent.name || ''}
                  onChange={(e) =>
                    setSelectedAgent({ ...selectedAgent, name: e.target.value })
                  }
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-sm focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
                  Цвет
                </label>
                <input
                  type="color"
                  value={selectedAgent.color || '#3B82F6'}
                  onChange={(e) =>
                    setSelectedAgent({
                      ...selectedAgent,
                      color: e.target.value,
                    })
                  }
                  className="w-full h-8.5 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
                Инструкции (System Prompt)
              </label>
              <textarea
                value={selectedAgent.system_prompt || ''}
                onChange={(e) =>
                  setSelectedAgent({
                    ...selectedAgent,
                    system_prompt: e.target.value,
                  })
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                rows={12}
                className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-sm focus:border-blue-500/50 outline-none resize-none leading-relaxed font-mono"
                placeholder="Ты — эксперт в области..."
              />
            </div>

            {/* Мозг */}
            <div className="p-3 bg-card rounded-md border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={16} />
                <span className="text-xs uppercase font-bold tracking-wider">
                  Мозг Агента
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-xs uppercase mb-1 block font-bold">
                    Провайдер
                  </label>
                  <select
                    value={settings.provider}
                    onChange={(e) => {
                      const newProvider = e.target
                        .value as keyof typeof MODELS_CONFIG
                      // Обновляем всё одной командой, чтобы React не запутался
                      setSelectedAgent({
                        ...selectedAgent,
                        model_settings: {
                          ...settings,
                          provider: newProvider,
                          model: MODELS_CONFIG[newProvider][0].id,
                        },
                      })
                    }}
                    className="w-full bg-card border border-border rounded-sm p-1.5 text-sm outline-none focus:border-blue-500/50"
                  >
                    <option value="google">Google</option>
                    <option value="groq">Groq</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase mb-1 block font-bold">
                    Модель
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => updateSetting('model', e.target.value)}
                    className="w-full bg-card border border-border rounded-sm p-1.5 text-sm outline-none focus:border-blue-500/50"
                  >
                    {MODELS_CONFIG[
                      settings.provider as keyof typeof MODELS_CONFIG
                    ]?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-blue-400" />
                <span className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
                  Контекст и Доступ
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/5 hover:bg-muted/10 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Манифест пользователя
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.user_manifesto}
                    onChange={() => togglePermission('user_manifesto')}
                    className="w-4 h-4 accent-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/5 hover:bg-muted/10 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <FolderKanban size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Манифест Проекта
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.project_manifesto}
                    onChange={() => togglePermission('project_manifesto')}
                    className="w-4 h-4 accent-blue-500"
                  />
                </label>
              </div>

              {/* Выбор инструментов */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench size={18} className="text-muted-foreground" />
                  <span className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
                    Доступные инструменты
                  </span>
                </div>
                <div className="space-y-1.5">
                  {AVAILABLE_TOOLS.map((tool) => (
                    <label
                      key={tool.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 bg-muted/5 hover:border-border cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.tools?.includes(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                        className="w-3.5 h-3.5 accent-blue-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">
                          {tool.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase">
                          {tool.category} • {tool.id.split(':')[1]}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Playground */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Terminal size={18} />
                <span className="text-xs uppercase font-bold tracking-wide">
                  Playground
                </span>
              </div>

              <div className="space-y-2">
                <textarea
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="w-full bg-black/20 border border-border rounded-lg p-3 text-sm min-h-20 focus:border-blue-500/50 outline-none"
                  placeholder="Введите тестовый запрос для агента..."
                />
                <button
                  type="button"
                  disabled={isTesting || !testQuery}
                  onClick={async () => {
                    setIsTesting(true)
                    try {
                      // Вызываем наш useAgent с флагом isTest
                      const res = await runAgent(selectedAgent.id!, {
                        query: testQuery,
                        isTest: true,
                        scope: 'test',
                      })
                      setTestResult(res)
                      toast.success('Тест завершен')
                    } catch (e) {
                      toast.error(`Ошибка теста: ${e}`)
                    } finally {
                      setIsTesting(false)
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-muted hover:bg-muted-foreground/10 border border-border rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Play size={18} />
                  )}
                  Запустить симуляцию
                </button>
              </div>

              {testResult && (
                <div className="p-3 bg-black/40 rounded-lg border border-border overflow-hidden">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground uppercase font-bold">
                      Результат AI:
                    </span>
                    <button
                      onClick={() => setTestResult(null)}
                      className="text-xs hover:text-white cursor-pointer"
                    >
                      Очистить
                    </button>
                  </div>
                  <div className="text-xs space-y-2">
                    {testResult.content && (
                      <div className="text-xs text-blue-200 leading-relaxed bg-blue-500/5 p-2.5 rounded border border-blue-500/20">
                        {testResult.content}
                      </div>
                    )}

                    {testResult.test_report?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-green-400 font-bold uppercase tracking-tighter">
                          Имитация мутаций БД:
                        </span>
                        {testResult.test_report.map(
                          (report: any, i: number) => (
                            <div key={i} className="group relative">
                              <div className="text-xs font-mono mb-1 text-purple-400 font-bold">
                                {report.tool}
                              </div>
                              <pre className="text-xs font-mono bg-black/60 p-2.5 rounded border border-white/10 overflow-x-auto custom-scrollbar text-white/80 leading-normal">
                                {JSON.stringify(report.payload, null, 2)}
                              </pre>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Метрики запроса */}
                  {testResult.usage && (
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b border-white/5 overflow-x-auto no-scrollbar">
                      <div className="shrink-0">
                        <div className="text-[8px] text-muted-foreground uppercase font-bold">
                          Tokens
                        </div>
                        <div className="text-xs font-mono text-blue-400">
                          {testResult.usage.input_tokens}{' '}
                          <span className="text-white/20">/</span>{' '}
                          {testResult.usage.output_tokens}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <div className="text-[8px] text-muted-foreground uppercase font-bold">
                          Total
                        </div>
                        <div className="text-xs font-mono text-white/80">
                          {testResult.usage.total_tokens}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <div className="text-[8px] text-muted-foreground uppercase font-bold">
                          Cost
                        </div>
                        <div className="text-xs font-mono text-green-400">
                          ${testResult.usage.cost_usd.toFixed(5)}
                        </div>
                      </div>
                      <div className="shrink-0 ml-auto">
                        <div className="text-[8px] text-muted-foreground uppercase font-bold text-right">
                          Model
                        </div>
                        <div className="text-[10px] font-mono text-white/40">
                          {testResult.usage.model}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full mb-2 bg-blue-500/80 hover:bg-blue-500 text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 transition-all mt-auto cursor-pointer"
            >
              <Save size={20} /> Сохранить
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
