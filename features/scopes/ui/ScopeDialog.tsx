'use client'

import { useState, useEffect } from 'react'
import { createScope, updateScope, deleteScope } from '../model/actions'
import { useScopeStore, Scope } from '../model/store'
import { toast } from 'sonner'
import { X, Trash2, Save, Box } from 'lucide-react'

interface ScopeDialogProps {
  isOpen: boolean
  onClose: () => void
  scopeToEdit?: Scope | null // Если null - режим создания
}

export function ScopeDialog({
  isOpen,
  onClose,
  scopeToEdit,
}: ScopeDialogProps) {
  const { addScope, updateScopeInStore, removeScopeFromStore } = useScopeStore()

  const [name, setName] = useState('')
  const [manifesto, setManifesto] = useState('')
  const [viewType, setViewType] = useState('roadmap')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      setName(scopeToEdit?.name || '')
      setManifesto(scopeToEdit?.manifesto || '') // Используем манифест как описание
      setViewType(scopeToEdit?.view_type || 'roadmap')
    }
  }, [isOpen, scopeToEdit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (scopeToEdit) {
        // UPDATE
        const updated = await updateScope(scopeToEdit.id, {
          name,
          manifesto: manifesto,
          view_type: viewType,
        })
        updateScopeInStore(scopeToEdit.id, updated)
        toast.success('Проект обновлен')
      } else {
        // CREATE
        const created = await createScope(name, viewType)
        addScope(created)
        toast.success('Проект создан')
      }
      onClose()
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!scopeToEdit || !confirm('Удалить проект безвозвратно?')) return
    setIsSubmitting(true)
    try {
      await deleteScope(scopeToEdit.id)
      removeScopeFromStore(scopeToEdit.id)
      toast.success('Проект удален')
      onClose()
    } catch (e) {
      toast.error(`Ошибка удаления: ${e}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Box size={18} className="text-primary" />
            {scopeToEdit ? 'Настройки проекта' : 'Новый проект'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Название
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              placeholder="Например: Fleeets"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Тип визуализации
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="roadmap">Roadmap (Стратегия)</option>
              <option value="kanban">Kanban (Поток)</option>
              <option value="graph">Graph (База знаний)</option>
              <option value="list">List (Простой список)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Манифест
            </label>
            <textarea
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm h-24 resize-none outline-none focus:border-primary custom-scrollbar"
              placeholder="Опиши суть проекта для Агентов..."
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            {scopeToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> Удалить
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:opacity-90 px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Save size={16} /> Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
