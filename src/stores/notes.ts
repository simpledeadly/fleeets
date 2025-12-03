import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface Note {
  id: string
  user_id?: string
  content: string
  file_url?: string
  file_type?: string
  file_name?: string
  updated_at: string
  created_at?: string // Добавил поле, чтобы сортировка работала корректно
}

// Утилита для генерации ID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const isSyncing = ref(false)

  // Храним подписку в переменной, чтобы не экспортировать её наружу
  let realtimeChannel: any = null

  // 1. Загрузка + Подписка
  const fetchNotes = async () => {
    isSyncing.value = true

    // Сначала грузим статику
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: true }) // Старые сверху, новые снизу

    if (data) notes.value = data
    isSyncing.value = false

    // Сразу включаем магию Realtime
    subscribeToRealtime()
  }

  // --- REALTIME MAGIC ---
  const subscribeToRealtime = async () => {
    // Если уже подписаны — выходим, чтобы не дублировать
    if (realtimeChannel) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    realtimeChannel = supabase
      .channel('notes_sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Слушаем INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`, // Только свои заметки
        },
        (payload) => handleRealtimeEvent(payload as RealtimePostgresChangesPayload<Note>)
      )
      .subscribe()

    console.log('🔌 Realtime подключен')
  }

  const handleRealtimeEvent = (payload: RealtimePostgresChangesPayload<Note>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT': {
        const note = newRecord as Note
        // Проверяем, есть ли эта заметка уже (Optimistic UI мог её добавить)
        const existingIndex = notes.value.findIndex((n) => n.id === note.id)

        if (existingIndex !== -1) {
          // Если есть — обновляем её серверными данными (там правильный URL файла и даты)
          notes.value[existingIndex] = note
        } else {
          // Если нет (пришло с другого устройства) — добавляем в конец
          notes.value.push(note)
        }
        break
      }
      case 'UPDATE': {
        const note = newRecord as Note
        const index = notes.value.findIndex((n) => n.id === note.id)
        if (index !== -1) {
          notes.value[index] = note
        }
        break
      }
      case 'DELETE': {
        // Удаляем, если пришло событие удаления
        if (oldRecord && oldRecord.id) {
          notes.value = notes.value.filter((n) => n.id !== oldRecord.id)
        }
        break
      }
    }
  }
  // ----------------------

  // 2. МГНОВЕННОЕ Создание (Optimistic)
  const addNote = (content: string, userId: string, file?: File) => {
    const tempId = generateUUID()
    let fileUrl = null
    let fileType = null
    let fileName = null

    if (file) {
      fileType = file.type.startsWith('image/') ? 'image' : 'file'
      fileName = file.name
      fileUrl = URL.createObjectURL(file)
    }

    const newNote: Note = {
      id: tempId,
      user_id: userId,
      content: content,
      file_url: fileUrl || undefined,
      file_type: fileType || undefined,
      file_name: fileName || undefined,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    // Добавляем локально мгновенно
    notes.value.push(newNote)

    // Крутим сохранение в фоне
    processUploadAndSave(userId, tempId, content, file, newNote)
  }

  // Фоновая функция сохранения
  const processUploadAndSave = async (
    userId: string,
    noteId: string,
    content: string,
    file: File | undefined,
    localNote: Note
  ) => {
    isSyncing.value = true
    let serverFileUrl = localNote.file_url

    try {
      if (file) {
        const fileExt = file.name.split('.').pop()
        const path = `${userId}/${noteId}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('files').upload(path, file)

        if (!uploadError) {
          const { data } = supabase.storage.from('files').getPublicUrl(path)
          serverFileUrl = data.publicUrl
        }
      }

      // Пишем в базу
      // (Ответ от базы нам по сути не нужен, так как Realtime пришлет событие INSERT,
      // и мы обновим данные через handleRealtimeEvent, но select() тут не помешает для надежности)
      await supabase.from('notes').insert({
        id: noteId,
        user_id: userId,
        content: content,
        file_url: serverFileUrl,
        file_type: localNote.file_type,
        file_name: localNote.file_name,
      })
    } catch (e) {
      console.error('Ошибка фоновой синхронизации', e)
    } finally {
      isSyncing.value = false
    }
  }

  // 3. МГНОВЕННОЕ Обновление
  const updateNote = async (id: string, content: string) => {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return

    note.content = content
    isSyncing.value = true

    supabase
      .from('notes')
      .update({ content })
      .eq('id', id)
      .then(() => {
        isSyncing.value = false
      })
  }

  // 4. МГНОВЕННОЕ Удаление
  const deleteNote = async (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id)
    isSyncing.value = true

    supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .then(() => {
        isSyncing.value = false
      })
  }

  // 5. Очистка при выходе
  const clearNotes = () => {
    notes.value = []
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return {
    notes,
    isSyncing,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    clearNotes,
  }
})
