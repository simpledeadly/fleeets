'use client'

import { useState } from 'react'
import { useScopeStore, Scope } from '@/features/scopes/model/store'
import { switchScopeAction } from '@/features/scopes/model/actions'
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
import { cn } from '@/lib/utils'

export function ProjectHub() {
  const {
    scopes,
    activeScope,
    setActiveScope,
    setIsScopeDialogOpen,
    setEditingScope,
  } = useScopeStore()

  const handleSwitch = async (scope: Scope) => {
    setActiveScope(scope)
    await switchScopeAction(scope.id)
  }

  const openCreate = () => {
    setEditingScope(null)
    setIsScopeDialogOpen(true)
  }

  const openEdit = (e: React.MouseEvent, scope: Scope) => {
    e.stopPropagation()
    setEditingScope(scope)
    setIsScopeDialogOpen(true)
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
          <h1 className="text-lg font-bold tracking-tight">Проекты</h1>
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
            const accent = scope.theme_config?.accent || '#3b82f6'

            return (
              <div
                key={scope.id}
                onClick={() => handleSwitch(scope)}
                className={cn(
                  'group relative p-6 rounded-2xl border transition-all cursor-pointer flex flex-col h-64 overflow-hidden',
                  isActive
                    ? 'ring-2 ring-primary/20 shadow-xl'
                    : 'hover:shadow-lg hover:scale-[1.02] bg-card/40'
                )}
                style={{
                  borderColor: isActive ? accent : `${accent}30`,
                  backgroundColor: isActive ? `${accent}15` : 'transparent',
                  // @ts-ignore
                  '--scope-accent': accent,
                }}
              >
                {/* Индикатор активности */}
                {isActive && (
                  <div
                    className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white shadow-sm"
                    style={{ backgroundColor: accent }}
                  >
                    <Activity size={12} /> Active
                  </div>
                )}

                {/* Иконка и Название */}
                <div className="mb-4 relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all shadow-sm group-hover:scale-110"
                    style={{
                      backgroundColor: isActive ? accent : `${accent}20`,
                      color: isActive ? '#fff' : accent,
                    }}
                  >
                    <span className="text-xl font-bold">
                      {scope.name[0].toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight truncate pr-20">
                    {scope.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground uppercase tracking-wider font-bold opacity-70">
                    <ViewIcon type={scope.view_type} />
                    {scope.view_type}
                  </div>
                </div>

                {/* Описание (Манифест) */}
                <div className="flex-1 overflow-hidden relative z-10">
                  <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed font-medium">
                    {scope.manifesto || 'Нет описания...'}
                  </p>
                </div>

                {/* Футер */}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                  <button
                    onClick={(e) => openEdit(e, scope)}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Settings size={20} />
                  </button>

                  <span
                    className="flex items-center gap-1 text-sm font-bold"
                    style={{ color: isActive ? accent : undefined }}
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

      {/* Модалка теперь глобальная в LayoutClient */}
    </div>
  )
}
