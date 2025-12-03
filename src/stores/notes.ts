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

  // 1. Загрузка + Старт подписки
  const fetchNotes = async () => {
    isSyncing.value = true
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) notes.value = data
    isSyncing.value = false

    subscribeToRealtime()
  }

  // 2. Подписка (Realtime)
  const subscribeToRealtime = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (realtimeChannel) await supabase.removeChannel(realtimeChannel)

    realtimeChannel = supabase
      .channel('notes_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => handleRealtimeEvent(payload as RealtimePostgresChangesPayload<Note>)
      )
      .subscribe()
  }

  // 3. Обработка событий
  const handleRealtimeEvent = (payload: RealtimePostgresChangesPayload<Note>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (!newRecord && eventType !== 'DELETE') return

    switch (eventType) {
      case 'INSERT': {
        const note = newRecord as Note
        // Проверяем дубликаты (Optimistic UI)
        const exists = notes.value.find((n) => n.id === note.id)
        if (!exists) {
          notes.value.push(note)
        } else {
          // Если заметка уже есть (мы её создали), обновляем её данные с сервера
          Object.assign(exists, note)
        }
        break
      }
      case 'UPDATE': {
        const note = newRecord as Note
        const existingNote = notes.value.find((n) => n.id === note.id)

        if (existingNote) {
          Object.assign(existingNote, note)
        }
        break
      }
      case 'DELETE': {
        if (oldRecord && oldRecord.id) {
          notes.value = notes.value.filter((n) => n.id !== oldRecord.id)
        }
        break
      }
    }
  }

  // --- CRUD (Optimistic UI) ---
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

    notes.value.push(newNote)
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
        const fileExt = file.name.split('.').pop()
        const path = `${userId}/${noteId}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('files').upload(path, file)
        if (!uploadError) {
          const { data } = supabase.storage.from('files').getPublicUrl(path)
          serverFileUrl = data.publicUrl
        }
      }

      await supabase.from('notes').insert({
        id: noteId,
        user_id: userId,
        content: content,
        file_url: serverFileUrl,
        file_type: localNote.file_type,
        file_name: localNote.file_name,
      })
    } catch (e) {
      console.error(e)
    } finally {
      isSyncing.value = false
    }
  }

  const updateNote = async (id: string, content: string) => {
    const note = notes.value.find((n) => n.id === id)
    if (!note) return
    note.content = content
    note.updated_at = new Date().toISOString()
    isSyncing.value = true
    supabase
      .from('notes')
      .update({ content })
      .eq('id', id)
      .then(() => {
        isSyncing.value = false
      })
  }

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

  const clearNotes = () => {
    notes.value = []
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return { notes, isSyncing, fetchNotes, addNote, updateNote, deleteNote, clearNotes }
})
