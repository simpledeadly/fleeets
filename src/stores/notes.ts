// src/stores/notes.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export interface Note {
  id: string
  content: string
  updated_at: string
  is_pinned: boolean
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const isLoading = ref(false)

  // 1. Скачать все заметки
  const fetchNotes = async () => {
    isLoading.value = true
    // RLS (политика базы) сама отфильтрует только заметки этого юзера
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) console.error('Ошибка загрузки:', error)
    else notes.value = data || []

    isLoading.value = false
  }

  // 2. Добавить новую заметку
  const addNote = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const newNote = {
      user_id: user.id,
      content: '', // Создаем пустую, как в Apple Notes
    }

    const { data, error } = await supabase.from('notes').insert(newNote).select().single()

    if (error) {
      console.error('Ошибка создания:', error)
    } else if (data) {
      // Добавляем в начало списка локально
      notes.value.unshift(data)
    }
  }

  // 3. Сохранить изменения (Обновить текст)
  const updateNote = async (id: string, content: string) => {
    // Сначала обновляем локально (чтобы интерфейс был быстрым)
    const note = notes.value.find((n) => n.id === id)
    if (note) note.content = content

    // Отправляем в базу
    const { error } = await supabase
      .from('notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) console.error('Ошибка сохранения:', error)
  }

  // 4. Удалить заметку
  const deleteNote = async (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id) // Удаляем визуально сразу

    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) console.error('Ошибка удаления:', error)
  }

  return { notes, isLoading, fetchNotes, addNote, updateNote, deleteNote }
})
