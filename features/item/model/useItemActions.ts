import { toast } from 'sonner'
import { useStore, type Item } from '@/lib/store'
import { updateItem, softDeleteItem, vectorizeItem } from './actions'
import { createClient } from '../../../lib/supabase/client'
import { useRef, useCallback } from 'react'

export function useItemActions(item: Item) {
  // Достаем методы стора
  // getState() позволяет читать данные без подписки на ре-рендеры
  const store = useStore.getState()
  const supabase = createClient()

  // 1. НАКОПИТЕЛЬ ИЗМЕНЕНИЙ (Фикс потери заголовка)
  // Здесь мы храним все поля, которые менялись за последние 500мс
  const pendingChangesRef = useRef<Partial<Item>>({})
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Получить САМУЮ свежую версию задачи из стора.
   * (Фикс возврата старой карточки)
   */
  const getFreshItem = () => {
    return useStore.getState().items.find((i) => i.id === item.id) || item
  }

  /**
   * update: Умное обновление с накопителем
   */
  const update = useCallback(
    async (changes: Partial<Item>, successMessage?: string) => {
      // 1. Optimistic Update (Мгновенно в UI)
      // Мержим изменения с текущим состоянием в сторе
      const freshItem = getFreshItem()

      const optimisticUpdate: any = { ...changes }
      if (
        freshItem.status === 'inbox' &&
        changes.status &&
        changes.status !== 'inbox'
      ) {
        optimisticUpdate.triaged_at = new Date().toISOString()
      }
      if (changes.status === 'inbox') {
        optimisticUpdate.triaged_at = null
      }

      // Обновляем стор в браузере (теперь с датой!)
      const newItem = { ...freshItem, ...optimisticUpdate }
      store.updateItem(newItem)

      // 2. Накапливаем изменения для сервера
      pendingChangesRef.current = { ...pendingChangesRef.current, ...changes }

      // 3. Подготовка Undo (Снимок делаем ДО отправки, но берем свежий item)
      // Важно: Снимок нужен только если это "важное" действие (свайп/статус)
      const previousItemSnapshot = { ...freshItem }

      // 4. Мгновенный Тост (Фикс тормозов)
      if (successMessage) {
        const undo = async () => {
          // Оптимистичный возврат
          store.updateItem(previousItemSnapshot)
          // Серверный возврат (без дебаунса, сразу)
          await updateItem(item.id, previousItemSnapshot)
        }

        toast.success(successMessage, {
          action: { label: 'Отмена', onClick: undo },
          duration: 4000,
        })
      }

      // 5. Серверная синхронизация (Debounced)
      // Если это смена статуса (свайп) - отправляем практически сразу (маленькая задержка для плавности)
      // Если это текст - ждем 1000мс (чтобы собрать все буквы)
      const isStatusChange = 'status' in changes || 'type' in changes
      const delay = isStatusChange ? 50 : 1000

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

      debounceTimerRef.current = setTimeout(async () => {
        // Забираем всё, что накопилось, и очищаем реф
        const payload = { ...pendingChangesRef.current }
        pendingChangesRef.current = {} // Очищаем ДО await, чтобы новые изменения не пропали

        const result = await updateItem(item.id, payload)

        if (result.error) {
          // Если сервер упал - откатываем UI
          store.updateItem(previousItemSnapshot)
          toast.error('Ошибка сохранения')
        }
      }, delay)
    },
    [item?.id]
  ) // Зависимость только от ID!

  /**
   * remove: Удаление
   */
  const remove = async () => {
    // 1. Свежий снимок
    const freshItem = getFreshItem()

    // 2. Optimistic Delete
    store.removeItem(item.id)

    // 3. Undo Logic
    const undo = async () => {
      // Возвращаем в стор
      store.addItem(freshItem)
      // Возвращаем на сервер (статус)
      await updateItem(item.id, { status: freshItem.status })
    }

    // 4. Мгновенный тост
    toast.success('Удалено', {
      action: { label: 'Вернуть', onClick: undo },
      duration: 4000,
    })

    // 5. Server
    await softDeleteItem(item.id)
  }

  /**
   * AI Refine (Мгновенный апдейт)
   */
  const refine = async () => {
    const toastId = toast.loading('AI думает...')

    try {
      const { data, error } = await supabase.functions.invoke('refine-item', {
        body: { item_id: item.id },
      })

      if (error) throw error

      if (data) {
        // Мержим с текущим состоянием стора
        const current = getFreshItem()
        const merged = { ...current, ...data }
        store.updateItem(merged)
        toast.success('Улучшено!', { id: toastId })
      }
    } catch (err) {
      console.error('Refine error:', err)
      toast.error('Ошибка AI', { id: toastId })
    }
  }

  const toggleBlitz = () => update({ is_quick: !item.is_quick }) // Без тоста
  const setType = (type: Item['type']) => update({ type }) // Без тоста

  const vectorize = useCallback(async () => {
    const toastId = toast.loading('Обновляем вектор смысла...')

    const result = await vectorizeItem(item.id)

    if (result.success) {
      toast.success('Второй мозг запомнил изменения!', { id: toastId })
    } else {
      toast.error('Ошибка векторизации', { id: toastId })
    }
  }, [])

  return { update, remove, refine, toggleBlitz, setType, vectorize }
}
