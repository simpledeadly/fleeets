// src/stores/inbox.ts
import { defineStore } from 'pinia'
import { supabase } from '../supabase'

export const useInboxStore = defineStore('inbox', {
  state: () => ({
    queue: [] as any[], // Очередь карточек на обработку
    loading: false,
    hasNewItems: false, // Для индикатора (красная точка)
  }),
  actions: {
    async fetchInbox() {
      this.loading = true
      // Забираем записи со статусом 'new'
      const { data, error } = await supabase
        .from('inbox')
        .select('*')
        .eq('status', 'new')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Ошибка загрузки инбокса:', error)
      } else if (data) {
        this.processQueue(data)
        this.hasNewItems = data.length > 0
      }
      this.loading = false
    },

    processQueue(rawItems: any[]) {
      const flatList: any[] = []

      rawItems.forEach((row) => {
        // Проверяем, есть ли items внутри structured_data
        const items = row.structured_data?.items || []

        items.forEach((item: any, index: number) => {
          flatList.push({
            ...item, // content, type, tags
            _dbId: row.id, // ID записи в базе (для обновления статуса)
            _index: index, // Индекс внутри JSON (на будущее)
          })
        })
      })

      this.queue = flatList
    },

    async resolveCard(action: 'accept' | 'reject') {
      const item = this.queue[0]
      if (!item) return

      if (action === 'accept') {
        // 1. Получаем текущего юзера
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error('Ошибка: Пользователь не авторизован')
          return
        }

        // 2. Создаем заметку с явным указанием user_id
        const { error } = await supabase.from('notes').insert({
          content: item.content,
          user_id: user.id, // <--- ВОТ ЭТО ВАЖНО
          // Если у тебя есть колонка tags в notes, раскомментируй:
          // tags: item.tags
        })

        if (error) {
          console.error('Ошибка создания заметки:', error)
          alert(`Не удалось сохранить: ${error.message}`) // Покажем ошибку явно
          return // Не удаляем из очереди, если ошибка
        }
      }

      // 3. Убираем из UI (только если успех или реджект)
      const removedItem = this.queue.shift()

      // 4. Обновляем статус в inbox
      // (Логика: проверяем, остались ли еще айтемы от этой записи)
      const hasMoreFromThisSource = this.queue.some((i) => i._dbId === removedItem._dbId)

      if (!hasMoreFromThisSource) {
        await supabase.from('inbox').update({ status: 'processed' }).eq('id', removedItem._dbId)
      }

      this.hasNewItems = this.queue.length > 0
    },
  },
})
