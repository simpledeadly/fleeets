'use client'

import { useState, useEffect, useRef } from 'react'
import { useScopeStore, Scope } from '../model/store'
import { createScope, getScopes, switchScopeAction } from '../model/actions'
import { ChevronsUpDown, Plus, Box, Check } from 'lucide-react'
import { cn } from '@/lib/utils' // Убедись, что у тебя есть cn (clsx + tailwind-merge)

interface ScopeSwitcherProps {
  isCollapsed?: boolean // Принимаем состояние сайдбара
}

export function ScopeSwitcher({ isCollapsed = false }: ScopeSwitcherProps) {
  const { scopes, activeScope, setScopes, setActiveScope, setIsLoading } =
    useScopeStore()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Закрытие по клику вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const init = async () => {
      const data = await getScopes()
      setScopes(data.scopes)

      const current =
        data.scopes.find((s: Scope) => s.id === data.activeScopeId) ||
        data.scopes[0]
      if (current) setActiveScope(current)
      setIsLoading(false)
    }
    init()
  }, [])

  const handleSwitch = async (scopeId: string) => {
    const target = scopes.find((s: Scope) => s.id === scopeId)
    if (!target) return

    setActiveScope(target)
    setIsOpen(false)
    await switchScopeAction(scopeId)
  }

  if (!activeScope)
    return <div className="h-10 w-full bg-muted/10 animate-pulse rounded-lg" />

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* Кнопка открытия */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group flex w-full items-center rounded-lg border border-transparent p-2 transition-all hover:bg-white/5 hover:border-white/10 outline-none',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          {/* Иконка (всегда видна, не сжимается) */}
          <div className="w-8 h-8 shrink-0 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
            {/* Берем первую букву, если нет иконки */}
            {activeScope.name ? (
              <span className="font-bold text-xs">
                {activeScope.name[0].toUpperCase()}
              </span>
            ) : (
              <Box size={16} />
            )}
          </div>

          {/* Текст (скрываем, если collapsed) */}
          {!isCollapsed && (
            <div className="flex flex-col items-start min-w-0 overflow-hidden">
              <span className="text-sm font-bold truncate w-full text-left text-foreground">
                {activeScope.name}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate w-full text-left">
                {activeScope.view_type}
              </span>
            </div>
          )}
        </div>

        {/* Шеврон (скрываем, если collapsed) */}
        {!isCollapsed && (
          <ChevronsUpDown
            size={14}
            className="text-muted-foreground opacity-50 group-hover:opacity-100 shrink-0 ml-2"
          />
        )}
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 w-56',
            // Если сайдбар свернут, меню вылезает сбоку (слева) или остается под иконкой
            isCollapsed ? 'left-0' : 'left-0 w-full'
          )}
          style={isCollapsed ? { left: '100%', top: 0, marginLeft: '8px' } : {}}
        >
          <div className="px-2 py-1.5 text-[10px] uppercase font-bold text-muted-foreground bg-muted/20">
            Мои Проекты
          </div>

          <div className="p-1 max-h-60 overflow-y-auto custom-scrollbar">
            {scopes.map((scope: Scope) => (
              <button
                key={scope.id}
                onClick={() => handleSwitch(scope.id)}
                className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors ${
                  scope.id === activeScope.id
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-foreground hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      scope.id === activeScope.id ? 'bg-blue-400' : 'bg-muted'
                    }`}
                  />
                  <span className="truncate">{scope.name}</span>
                </div>
                {scope.id === activeScope.id && <Check size={14} />}
              </button>
            ))}
          </div>

          <div className="p-1 border-t border-border">
            <button
              onClick={() => createScope('dora')}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors"
            >
              <Plus size={14} />
              <span>Создать проект</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
