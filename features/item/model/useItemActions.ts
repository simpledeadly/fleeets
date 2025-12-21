import { toast } from 'sonner'
import { useStore, type Item } from '@/lib/store'
import { updateItem, softDeleteItem } from './actions'
import { createClient } from '@/lib/supabase/client'
import { useCallback, useRef } from 'react'
import { notify } from '@/features/notifications'

export function useItemActions(item: Item) {
  const {
    updateItem: updateStore,
    removeItem: removeStore,
    addItem: addStore,
  } = useStore.getState()
  const supabase = createClient()

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  /**
   * Универсальное обновление
   */
  const update = useCallback(
    async (changes: Partial<Item>, successMessage?: string) => {
      // 1. Snapshot (для отката)
      const previousItem = { ...item }

      // 2. Optimistic: Применяем изменения в UI МГНОВЕННО
      // Важно: мы берем текущее состояние из пропса item, но накладываем changes
      const newItem = { ...item, ...changes }
      updateStore(newItem)

      const undo = async () => {
        // Возвращаем в стор
        updateStore(previousItem)
        await updateItem(item.id, previousItem)
        // toast.info("Действие отменено")
      }

      // 3. Серверная часть (DEBOUNCED)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(async () => {
        // Тут мы отправляем запрос
        const result = await updateItem(item.id, changes)

        if (result.error) {
          updateStore(previousItem) // Откат при ошибке
          toast.error('Ошибка сохранения')
        } else if (successMessage) {
          // Тост показываем только когда реально сохранилось (или можно сразу, по вкусу)
          // Но лучше здесь, чтобы не спамить тостами
          toast.success(successMessage, {
            action: { label: 'Отмена', onClick: undo },
            duration: 4000, // Даем 4 секунды на подумать
          })
        }
      }, 800) // Ждем 500мс тишины перед отправкой
    },
    [item, updateStore]
  )

  /**
   * Удаление
   */
  const remove = async () => {
    const previousItem = { ...item }

    // 1. Optimistic
    removeStore(item.id)

    // 2. Undo Logic
    const undo = async () => {
      // Сразу возвращаем в UI
      addStore({ ...previousItem })

      const { error } = await updateItem(item.id, {
        status: previousItem.status,
      })
      if (error) {
        notify('info', 'Не удалось восстановить')
        removeStore(item.id) // Если сервер отказал, удаляем обратно
      } else {
        // toast.info('Задача восстановлена')
      }
    }

    notify('success', 'Удалено', {
      action: { label: 'Вернуть', onClick: undo },
      duration: 4000,
    })

    await softDeleteItem(item.id)
  }

  /**
   * AI Refine
   */
  const refine = async () => {
    const toastId = toast.loading('AI думает...')

    try {
      const { data, error } = await supabase.functions.invoke('refine-item', {
        body: { item_id: item.id },
      })

      if (error) throw error

      if (data) {
        const mergedItem = { ...item, ...data }
        updateStore(mergedItem)
        toast.success('Обработано!', { id: toastId })
      }
    } catch (err) {
      console.error('Refine error:', err)
      toast.error('Ошибка AI', { id: toastId })
    }
  }

  const toggleBlitz = () => update({ is_quick: !item.is_quick })
  const setType = (type: Item['type']) => update({ type })

  return { update, remove, refine, toggleBlitz, setType }
}
