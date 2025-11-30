<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from './supabase'
import TelegramLogin from './components/TelegramLogin.vue'
import { useNotesStore } from './stores/notes'
import { Plus, Trash2, LogOut, Menu } from 'lucide-vue-next'

const user = ref<any>(null)
const notesStore = useNotesStore()
const activeNoteId = ref<string | null>(null)

// Computed: Активная заметка для редактора
const activeNote = computed(() => notesStore.notes.find((n) => n.id === activeNoteId.value))

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    user.value = data.session.user
    await notesStore.fetchNotes()
    // Выбираем первую заметку, если есть
    if (notesStore.notes.length > 0) activeNoteId.value = notesStore.notes[0].id
  }
})

const handleLogin = async (telegramUser: any) => {
  const { data } = await supabase.functions.invoke('telegram-auth', {
    body: { user: telegramUser },
  })
  if (data?.access_token) {
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    const { data: userData } = await supabase.auth.getUser()
    user.value = userData.user
    await notesStore.fetchNotes()
  }
}

const createNote = () => {
  notesStore.addNote()
  
  if (notesStore.notes.length > 0) {
    activeNoteId.value = notesStore.notes[0].id
  }
}

const deleteActiveNote = async () => {
  if (!activeNoteId.value) return
  await notesStore.deleteNote(activeNoteId.value)
  activeNoteId.value = notesStore.notes.length > 0 ? notesStore.notes[0].id : null
}

const logout = async () => {
  await supabase.auth.signOut()
  user.value = null
  notesStore.notes = []
}

// Автосохранение
let timeout: any
const onType = () => {
  if (!activeNote.value) return
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    notesStore.updateNote(activeNote.value!.id, activeNote.value!.content)
  }, 500)
}

// Форматирование даты
const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Получение заголовка из первой строки
const getTitle = (content: string) => {
  return content.split('\n')[0] || 'Новая заметка'
}
const getPreview = (content: string) => {
  const lines = content.split('\n')
  return lines.length > 1 ? lines[1] : lines[0] ? 'Нет дополнительного текста' : ''
}
</script>

<template>
  <!-- ФОНОВАЯ КАРТИНКА -->
  <div class="fixed inset-0 z-[-1]">
    <img
      src="./assets/images/bg.png"
      class="w-full h-full object-cover blur-sm scale-105"
      alt="Background"
    />
    <div class="absolute inset-0 bg-black/40"></div>
    <!-- Затемнение -->
  </div>

  <div class="h-screen w-screen flex items-center justify-center p-4 md:p-8">
    <!-- ЭКРАН ВХОДА -->
    <div
      v-if="!user"
      class="bg-black/60 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-white/10 text-center max-w-md w-full"
    >
      <h1 class="text-3xl font-bold mb-2">Fleeets</h1>
      <p class="text-gray-400 mb-6">Ваши мысли, синхронизированные везде.</p>
      <TelegramLogin
        botName="fleeets_app_bot"
        @login="handleLogin"
      />
    </div>

    <!-- ГЛАВНЫЙ ИНТЕРФЕЙС -->
    <div
      v-else
      class="flex w-full h-full max-w-6xl bg-black/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
    >
      <!-- САЙДБАР (СПИСОК) -->
      <aside class="w-80 border-r border-white/5 flex flex-col bg-black/20">
        <!-- Шапка сайдбара -->
        <div class="p-4 border-b border-white/5 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img
              :src="user.user_metadata.avatar_url"
              class="w-8 h-8 rounded-full border border-white/20"
            />
            <span class="font-medium text-sm truncate max-w-[120px]">{{
              user.user_metadata.full_name
            }}</span>
          </div>
          <button
            @click="createNote"
            class="p-2 hover:bg-white/10 rounded-lg transition text-blue-400"
          >
            <Plus class="w-5 h-5" />
          </button>
        </div>

        <!-- Список заметок -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            v-for="note in notesStore.notes"
            :key="note.id"
            @click="activeNoteId = note.id"
            :class="[
              'p-3 rounded-lg cursor-pointer transition group',
              activeNoteId === note.id ? 'bg-white/10' : 'hover:bg-white/5 text-gray-400',
            ]"
          >
            <div class="font-medium text-white truncate">{{ getTitle(note.content) }}</div>
            <div class="text-xs opacity-60 truncate mt-1">{{ getPreview(note.content) }}</div>
            <div class="text-[10px] opacity-40 mt-2">{{ formatDate(note.updated_at) }}</div>
          </div>
        </div>

        <!-- Футер сайдбара -->
        <div class="p-3 border-t border-white/5">
          <button
            @click="logout"
            class="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition w-full p-2 rounded hover:bg-white/5"
          >
            <LogOut class="w-3 h-3" /> Выйти
          </button>
        </div>
      </aside>

      <!-- РЕДАКТОР (ЦЕНТР) -->
      <main class="flex-1 flex flex-col relative bg-transparent">
        <div
          v-if="activeNote"
          class="flex-1 flex flex-col h-full"
        >
          <!-- Тулбар -->
          <div
            class="h-12 flex justify-end items-center px-4 border-b border-transparent group-hover:border-white/5 transition"
          >
            <button
              @click="deleteActiveNote"
              class="text-gray-600 hover:text-red-400 p-2 transition"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <!-- Область текста -->
          <textarea
            v-model="activeNote.content"
            @input="onType"
            class="flex-1 w-full bg-transparent resize-none outline-none border-none p-8 text-lg leading-relaxed placeholder-gray-600 font-light"
            placeholder="Начните печатать вашу заметку..."
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Если ничего не выбрано -->
        <div
          v-else
          class="flex-1 flex flex-col items-center justify-center text-gray-600"
        >
          <Menu class="w-12 h-12 mb-4 opacity-20" />
          <p>Выберите заметку или создайте новую</p>
        </div>
      </main>
    </div>
  </div>
</template>
