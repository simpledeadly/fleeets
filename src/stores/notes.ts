import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export interface Note {
  id: string
  user_id?: string
  content: string
  file_url?: string
  file_type?: string
  file_name?: string // Добавим имя файла для красоты
  updated_at: string
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

  // 1. Загрузка (тут придется подождать, это инициализация)
  const fetchNotes = async () => {
    isSyncing.value = true
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) notes.value = data
    isSyncing.value = false
  }

  // 2. МГНОВЕННОЕ Создание
  const addNote = (content: string, userId: string, file?: File) => {
    // Генерируем ID синхронно
    const tempId = generateUUID()
    let fileUrl = null
    let fileType = null
    let fileName = null

    // Обработка файла для превью (синхронно)
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
    }

    // 1. БАМ! Добавляем в массив сразу же.
    // Никаких await, никаких промисов перед этой строкой.
    notes.value.push(newNote)

    // 2. А сохранение пусть крутится в фоне, нам плевать сколько оно займет
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
      const { data } = await supabase
        .from('notes')
        .insert({
          id: noteId, // Используем наш сгенерированный ID
          user_id: userId,
          content: content,
          file_url: serverFileUrl,
          file_type: localNote.file_type,
          file_name: localNote.file_name,
        })
        .select()
        .single()

      // Если все ок, обновляем ссылку в локальном сторе с Blob на реальный URL
      if (data) {
        const index = notes.value.findIndex((n) => n.id === noteId)
        if (index !== -1) notes.value[index] = data
      }
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

    // Меняем локально
    note.content = content

    // Шлем на сервер (не ждем)
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
    // Удаляем из массива сразу
    notes.value = notes.value.filter((n) => n.id !== id)

    // Шлем запрос на сервер
    isSyncing.value = true
    supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .then(() => {
        isSyncing.value = false
      })
  }

  return { notes, isSyncing, fetchNotes, addNote, updateNote, deleteNote }
})
