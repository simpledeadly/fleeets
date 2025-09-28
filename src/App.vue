<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api'
import { getCurrent } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { Textarea } from './components/ui/textarea'
import { Button } from './components/ui/button'

interface Note {
  id: number
  content: string
}

// --- СОСТОЯНИЕ ---
const zoomLevel = ref(1.0)
const ZOOM_STEP = 0.1
const noteContent = ref('')
const notes = ref<Note[]>([])
const appWindow = getCurrent()

// --- НОВАЯ ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ЗАМЕТКИ ---
function handleNoteSubmit() {
  const content = noteContent.value.trim()
  if (content) {
    // Создаем новый объект заметки
    const newNote: Note = {
      id: Date.now(), // Используем timestamp как уникальный ID
      content: content,
    }
    notes.value.unshift(newNote)
    noteContent.value = ''
  }
}

// --- ЛОГИКА ВЗАИМОДЕЙСТВИЯ С RUST ---
const saveNote = async () => {
  await invoke('save_note', { content: noteContent.value })
}

const loadNote = async () => {
  noteContent.value = await invoke<string>('load_note')
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    appWindow.hide()
    return
  }

  if (event.metaKey || event.ctrlKey) {
    let newZoom = zoomLevel.value
    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault()
        newZoom = Math.min(2.0, zoomLevel.value + ZOOM_STEP)
        break
      case '-':
        event.preventDefault()
        newZoom = Math.max(0.5, zoomLevel.value - ZOOM_STEP)
        break
      case '0':
        event.preventDefault()
        newZoom = 1.0
        break
    }

    if (newZoom !== zoomLevel.value) {
      zoomLevel.value = newZoom
      // ИСПРАВЛЕНО: Используем transform: scale() для качественного масштабирования
      const container = document.querySelector('.main-container')
      if (container) {
        ;(container as HTMLElement).style.transform = `scale(${zoomLevel.value})`
      }
    }
  }
}

// --- ЛОГИКА УПРАВЛЕНИЯ ОКНОМ ---
async function toggleWindow() {
  const isVisible = await appWindow.isVisible()
  if (isVisible) {
    appWindow.hide()
  } else {
    await appWindow.center()
    await appWindow.show()
    await appWindow.setFocus()
  }
}

onMounted(() => {
  loadNote()
  window.addEventListener('keydown', handleKeyDown)
  listen('toggle-window', toggleWindow)
  appWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused) {
      appWindow.hide()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook-test/fleets'

async function sendToN8n(noteToSend: Note) {
  if (!N8N_WEBHOOK_URL.startsWith('http')) {
    alert('Пожалуйста, установите корректный Webhook URL для n8n в коде App.vue')
    return
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: noteToSend.content, // Отправляем контент из объекта
        source: 'Fleets App',
        timestamp: new Date().toISOString(),
      }),
    })
    if (!response.ok) {
      throw new Error(`Сервер n8n ответил ошибкой: ${response.status}`)
    }

    // Удаляем заметку, находя ее по уникальному ID
    notes.value = notes.value.filter((note) => note.id !== noteToSend.id)
  } catch (error) {
    console.error('Ошибка при отправке в n8n:', error)
    alert(`Не удалось отправить заметку. Проверьте консоль и n8n.`)
  }
}
</script>

<template>
  <div
    @mousedown="appWindow.startDragging()"
    class="h-screen cursor-grab flex items-center justify-center p-8"
  >
    <div
      @mousedown="appWindow.startDragging()"
      class="main-container relative overflow-hidden w-full max-w-xl bg-neutral-950 rounded-xl p-4 cursor-grab flex flex-col gap-3"
    >
      <div
        v-if="notes.length > 0"
        class="flex-grow overflow-y-auto max-h-[50vh] pr-2"
      >
        <div
          v-for="(note, index) in notes"
          :key="index"
          class="text-neutral-200 px-2 py-1 whitespace-pre-wrap"
        >
          {{ note.content }}
          <Button
            @click="sendToN8n(note)"
            class="absolute top-2 right-2 p-1 rounded-lg bg-neutral-700/50 text-neutral-300 group-hover:opacity-100 transition-opacity hover:bg-blue-600 hover:text-white"
            title="Отправить в n8n"
          >
            <!-- Простая SVG иконка "стрелка вверх" -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 5v14" />
              <path d="m18 11-6-6-6 6" />
            </svg>
          </Button>
        </div>
      </div>

      <div
        @mousedown.stop
        class="growing-textarea-grid cursor-text"
        :data-replicated-value="noteContent"
      >
        <Textarea
          v-model="noteContent"
          @mousedown.stop
          @keydown.enter.prevent="handleNoteSubmit"
          @input="saveNote"
          placeholder="Начните печатать вашу заметку..."
          spellcheck="false"
          autofocus
          rows="1"
          class="bg-neutral-950 text-lg text-neutral-100 placeholder:text-neutral-500 rounded-lg resize-none overflow-hidden border border-neutral-800 ring-offset-neutral-950 focus-visible:ring-0 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        />
      </div>
      <p
        @mousedown.stop
        class="text-xs text-neutral-400 text-center border-t border-neutral-800 pt-2 cursor-default"
      >
        Нажмите Esc или кликните вне окна, чтобы скрыть
      </p>
      <div
        @mousedown.stop="appWindow.startDragging()"
        class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
      />
    </div>
  </div>
</template>

<!-- 
  Блок <style> был ПОЛНОСТЬЮ УДАЛЕН. 
  Все стили теперь управляются через Tailwind в <template> и глобальном main.css.
-->
