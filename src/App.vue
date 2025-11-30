<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import TelegramLogin from './components/TelegramLogin.vue'
import { useNotesStore } from './stores/notes'

const user = ref<any>(null)
const notesStore = useNotesStore()

// Проверяем, есть ли сессия при запуске
onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    user.value = data.session.user
    notesStore.fetchNotes() // Загружаем заметки, если вошли
  }
})

// Обработка входа
const handleLogin = async (telegramUser: any) => {
  console.log('Logging in...')
  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { user: telegramUser },
  })

  if (data?.access_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    if (!sessionError) {
      const { data: userData } = await supabase.auth.getUser()
      user.value = userData.user
      notesStore.fetchNotes() // Загружаем заметки после входа
    }
  }
}

// Автосохранение (debounce)
let timeout: any
const onType = (id: string, content: string) => {
  // Ждем пока юзер перестанет печатать 500мс, потом шлем в базу
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    console.log('Auto-saving...')
    notesStore.updateNote(id, content)
  }, 500)
}
</script>

<template>
  <div class="app-container">
    <!-- ЭКРАН ВХОДА -->
    <div
      v-if="!user"
      class="login-screen"
    >
      <h1>Fleeets Notes</h1>
      <TelegramLogin
        botName="fleeets_app_bot"
        @login="handleLogin"
      />
    </div>

    <!-- ЭКРАН ЗАМЕТОК -->
    <div
      v-else
      class="notes-screen"
    >
      <header>
        <span>👤 {{ user.user_metadata.full_name }}</span>
        <button @click="notesStore.addNote()">+ Новая заметка</button>
      </header>

      <div class="notes-list">
        <div v-if="notesStore.isLoading">Загрузка...</div>

        <div
          v-else
          v-for="note in notesStore.notes"
          :key="note.id"
          class="note-card"
        >
          <textarea
            v-model="note.content"
            @input="onType(note.id, note.content)"
            placeholder="Начните писать..."
          ></textarea>
          <button
            class="delete-btn"
            @click="notesStore.deleteNote(note.id)"
          >
            🗑
          </button>
        </div>

        <div v-if="notesStore.notes.length === 0 && !notesStore.isLoading">
          Нет заметок. Создайте первую!
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Быстрые стили для теста */
body {
  background: #1e1e1e;
  color: #fff;
  font-family: sans-serif;
  margin: 0;
}
.app-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
.login-screen {
  text-align: center;
  margin-top: 100px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.note-card {
  background: #2a2a2a;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  position: relative;
}
textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  min-height: 60px;
  resize: vertical;
  outline: none;
}
button {
  cursor: pointer;
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
}
.delete-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  background: transparent;
  color: #666;
  padding: 2px;
}
.delete-btn:hover {
  color: red;
}
</style>
