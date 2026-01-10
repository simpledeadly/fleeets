'use client'

import { useState } from 'react'
import { useScopeStore, Scope } from '@/features/scopes/model/store'
import { switchScopeAction } from '@/features/scopes/model/actions'
import { ScopeDialog } from '@/features/scopes/ui/ScopeDialog'
import {
  Plus,
  Settings,
  ArrowRight,
  Activity,
  Map,
  LayoutList,
  Share2,
  Box,
} from 'lucide-react'

export function ProjectHub() {
  const { scopes, activeScope, setActiveScope } = useScopeStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingScope, setEditingScope] = useState<Scope | null>(null)

  const handleSwitch = async (scope: Scope) => {
    setActiveScope(scope)
    await switchScopeAction(scope.id)
  }

  const openCreate = () => {
    setEditingScope(null)
    setIsDialogOpen(true)
  }

  const openEdit = (e: React.MouseEvent, scope: Scope) => {
    e.stopPropagation()
    setEditingScope(scope)
    setIsDialogOpen(true)
  }

  // Хелпер для иконки типа
  const ViewIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'roadmap':
        return <Map size={20} />
      case 'kanban':
        return <LayoutList size={20} />
      case 'graph':
        return <Share2 size={20} />
      default:
        return <Box size={20} />
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-card overflow-hidden animate-in fade-in duration-100">
      {/* ХЕДЕР */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold tracking-tight">
            Проекты
          </h1>
          <button
            onClick={openCreate}
            className="bg-primary text-sm hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} /> Новый Проект
          </button>
        </div>
      </div>

      {/* СЕТКА ПРОЕКТОВ */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {scopes.map((scope) => {
            const isActive = activeScope?.id === scope.id
            return (
              <div
                key={scope.id}
                onClick={() => handleSwitch(scope)}
                className={`
                  group relative p-6 rounded-2xl border transition-all cursor-pointer flex flex-col h-64
                  ${
                    isActive
                      ? 'bg-card border-primary/50 ring-1 ring-primary/20 shadow-xl shadow-primary/10'
                      : 'bg-card border-border hover:border-primary/30 hover:shadow-lg'
                  }
                `}
              >
                {/* Индикатор активности */}
                {isActive && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                    <Activity size={12} /> ACTIVE
                  </div>
                )}

                {/* Иконка и Название */}
                <div className="mb-4">
                  <div
                    className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
                    ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }
                  `}
                  >
                    <span className="text-xl font-semibold">
                      {scope.name[0].toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold truncate pr-16">
                    {scope.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    <ViewIcon type={scope.view_type} />
                    {scope.view_type}
                  </div>
                </div>

                {/* Описание (Манифест) */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed">
                    {scope.manifesto || 'Нет описания...'}
                  </p>
                </div>

                {/* Футер */}
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => openEdit(e, scope)}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings size={20} />
                  </button>

                  <span
                    className={`flex items-center gap-1 text-sm font-medium ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {isActive ? 'Вы работаете здесь' : 'Перейти'}{' '}
                    <ArrowRight size={18} />
                  </span>
                </div>
              </div>
            )
          })}

          {/* Карточка создания (Пустая) */}
          <button
            onClick={openCreate}
            className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/5 transition-all group text-muted-foreground hover:text-primary cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
              <Plus size={32} />
            </div>
            <span className="font-semibold">Создать новый проект</span>
          </button>
        </div>
      </div>

      {/* Модалка */}
      <ScopeDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        scopeToEdit={editingScope}
      />
    </div>
  )
}
