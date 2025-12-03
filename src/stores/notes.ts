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
  created_at?: string
}

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
  let realtimeChannel: any = null

  // 1. Загрузка
  const fetchNotes = async () => {
    isSyncing.value = true
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Ошибка загрузки:', error.message)
    } else {
      notes.value = data || []
      subscribeToRealtime()
    }
    isSyncing.value = false
  }

  // 2. Подписка (УПРОЩЕННАЯ)
  const subscribeToRealtime = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (realtimeChannel) await supabase.removeChannel(realtimeChannel)

    console.log('🔌 Подключение Realtime...')

    realtimeChannel = supabase
      .channel('notes_global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          // УБРАЛИ filter: user_id=...
          // Пусть RLS сам решает, что нам можно видеть, а что нет.
          // Это решает проблему "потерянных" апдейтов.
        },
        (payload) => handleRealtimeEvent(payload as RealtimePostgresChangesPayload<Note>)
      )
      .subscribe((status) => {
        console.log(`📡 Статус Realtime: ${status}`)
      })
  }

  // 3. Обработка событий
  const handleRealtimeEvent = (payload: RealtimePostgresChangesPayload<Note>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (!newRecord && eventType !== 'DELETE') return

    switch (eventType) {
      case 'INSERT': {
        const note = newRecord as Note
        const exists = notes.value.find((n) => n.id === note.id)
        if (!exists) {
          console.log('➕ Новая заметка с другого устройства')
          notes.value.push(note)
        }
        break
      }
      case 'UPDATE': {
        const note = newRecord as Note
        // Ищем индекс заметки
        const index = notes.value.findIndex((n) => n.id === note.id)

        if (index !== -1) {
          console.log('⚡️ UPDATE прилетел:', note.content) // Лог для проверки

          // 1. Берем старую заметку
          const oldNote = notes.value[index]

          // 2. Создаем АБСОЛЮТНО НОВЫЙ объект, объединяя старое и новое
          const updatedNote = { ...oldNote, ...note }

          // 3. Жестко заменяем элемент массива.
          // Метод splice триггерит перерисовку списка даже если Vue "спит".
          notes.value.splice(index, 1, updatedNote)
        }
        break
      }
      case 'DELETE': {
        if (oldRecord?.id) {
          console.log('🗑️ Заметка удалена')
          notes.value = notes.value.filter((n) => n.id !== oldRecord.id)
        }
        break
      }
    }
  }

  // --- CRUD (С ПРОВЕРКОЙ ОШИБОК) ---

  const addNote = (content: string, userId: string, file?: File) => {
    const tempId = generateUUID()
    const newNote: Note = {
      id: tempId,
      user_id: userId,
      content,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    // Optimistic Update
    notes.value.push(newNote)

    // Save to DB
    processUploadAndSave(userId, tempId, content, file, newNote)
  }

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
        // Логика загрузки файла... (без изменений)
      }

      const { error } = await supabase.from('notes').insert({
        id: noteId,
        user_id: userId,
        content: content,
        file_url: serverFileUrl,
      })

      if (error) {
        console.error('❌ ОШИБКА СОХРАНЕНИЯ (INSERT):', error.message)
        alert('Не удалось сохранить заметку! Проверьте консоль.')
      }
    } catch (e) {
      console.error(e)
    } finally {
      isSyncing.value = false
    }
  }

  const updateNote = async (id: string, content: string) => {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return

    // Мгновенно обновляем локально
    note.content = content
    note.updated_at = new Date().toISOString()

    isSyncing.value = true

    // ОТПРАВЛЯЕМ В БАЗУ И СМОТРИМ ОШИБКУ
    const { error } = await supabase
      .from('notes')
      .update({
        content: content,
        updated_at: new Date().toISOString(), // Явно обновляем дату
      })
      .eq('id', id)

    isSyncing.value = false

    if (error) {
      console.error('❌ ОШИБКА ОБНОВЛЕНИЯ (UPDATE):', error.message)
      // Если ошибка — откатываем локальное изменение (опционально) или показываем алерт
      console.log('Детали:', error)
    } else {
      console.log('✅ Успешно сохранено в базу')
    }
  }

  const deleteNote = async (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id)
    isSyncing.value = true

    const { error } = await supabase.from('notes').delete().eq('id', id)
    isSyncing.value = false

    if (error) console.error('❌ ОШИБКА УДАЛЕНИЯ:', error.message)
  }

  const clearNotes = () => {
    notes.value = []
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return { notes, isSyncing, fetchNotes, addNote, updateNote, deleteNote, clearNotes }
})
