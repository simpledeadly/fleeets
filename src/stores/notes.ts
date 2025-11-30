import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export interface Note {
  id: string
  user_id?: string
  content: string
  updated_at: string
  is_pinned: boolean
}

// Простая функция генерации UUID (работает везде, даже без HTTPS)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const isLoading = ref(false)

  // 1. Скачать все заметки
  const fetchNotes = async () => {
    isLoading.value = true
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) console.error('Ошибка загрузки:', error)
    else notes.value = data || []

    isLoading.value = false
  }

  // 2. Добавить новую заметку (Мгновенная)
  const addNote = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Генерируем ID вручную
    const tempId = generateUUID()

    const newNote: Note = {
      id: tempId,
      user_id: user.id,
      content: '',
      is_pinned: false,
      updated_at: new Date().toISOString(),
    }

    // МГНОВЕННО показываем
    notes.value.unshift(newNote)

    // Отправляем на сервер
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, content: '' }) // База создаст свой ID
      .select()
      .single()

    if (error) {
      console.error('Ошибка создания:', error)
      notes.value = notes.value.filter((n) => n.id !== tempId)
    } else if (data) {
      // Подменяем временную заметку на настоящую (с ID от базы)
      const index = notes.value.findIndex((n) => n.id === tempId)
      if (index !== -1) {
        notes.value[index] = data
      }
    }
  }

  // 3. Сохранить изменения
  const updateNote = async (id: string, content: string) => {
    const note = notes.value.find((n) => n.id === id)
    if (note) note.content = content

    const { error } = await supabase
      .from('notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) console.error('Ошибка сохранения:', error)
  }

  // 4. Удалить заметку
  const deleteNote = async (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id)

    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) console.error('Ошибка удаления:', error)
  }

  return { notes, isLoading, fetchNotes, addNote, updateNote, deleteNote }
})
