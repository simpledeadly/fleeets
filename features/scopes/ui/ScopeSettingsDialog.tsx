'use client'
import { useState } from 'react'
import { useScopeStore } from '../model/store'
import { updateScope, deleteScope } from '../model/actions'
import { toast } from 'sonner'

export function ScopeSettings() {
  const { activeScope, updateScopeInStore, removeScopeFromStore } =
    useScopeStore()
  const [name, setName] = useState(activeScope?.name || '')
  const [manifesto, setManifesto] = useState(activeScope?.manifesto || '')

  if (!activeScope) return null

  const handleSave = async () => {
    try {
      const updated = await updateScope(activeScope.id, { name, manifesto })
      updateScopeInStore(activeScope.id, updated)
      toast.success('Настройки сохранены')
      // onClose()
    } catch (e) {
      toast.error(`Ошибка сохранения: ${e}`)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить проект и ВСЕ его задачи? Это необратимо.')) return
    try {
      await deleteScope(activeScope.id)
      removeScopeFromStore(activeScope.id)
      toast.success('Проект удален')
      // onClose()
      // Тут можно сделать редирект или авто-выбор другого
    } catch (e) {
      toast.error(`Ошибка удаления: ${e}`)
    }
  }

  return (
    <div className="space-y-6 mb-10">
      <h2 className="text-lg font-bold">Настройки: {activeScope.name}</h2>

      <div className="space-y-2">
        <label className="text-xs uppercase font-bold text-muted-foreground">
          Название
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-muted/20 border border-border rounded p-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase font-bold text-muted-foreground">
          Манифест Проекта
        </label>
        <textarea
          value={manifesto}
          onChange={(e) => setManifesto(e.target.value)}
          className="w-full h-32 bg-muted/20 border border-border rounded p-2 text-sm font-mono"
          placeholder="Опиши суть, цели и правила этого проекта..."
        />
        <p className="text-[10px] text-muted-foreground">
          Этот текст будет автоматически добавляться в контекст Агентов при
          работе в этом проекте.
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          className="text-red-400 text-xs hover:underline"
        >
          Удалить проект
        </button>
        <button
          onClick={handleSave}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-bold"
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}
