<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrent } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { Textarea } from './components/ui/textarea'
import { Button } from './components/ui/button'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/api/notification'
import { invoke } from '@tauri-apps/api'

async function checkNotificationPermission() {
  let permissionGranted = await isPermissionGranted()
  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === 'granted'
  }
}

async function showNotification(title: string, body: string) {
  await invoke('show_notification', { title, body })
}

interface Note {
  id: number
  content: string
  status: 'idle' | 'sending' // 'idle' - обычное состояние, 'sending' - отправляется
}

// --- СОСТОЯНИЕ ---
const zoomLevel = ref(1.0)
const ZOOM_STEP = 0.1
const noteContent = ref('')
const notes = ref<Note[]>([])
const appWindow = getCurrent()

function handleNoteSubmit() {
  const content = noteContent.value.trim()
  if (content) {
    const newNote: Note = {
      id: Date.now(),
      content: content,
      status: 'idle', // Новые заметки всегда в состоянии 'idle'
    }
    notes.value.unshift(newNote)
    noteContent.value = ''
  }
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

onMounted(async () => {
  await checkNotificationPermission()
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

async function testNotification() {
  console.log('Попытка отправить тестовое уведомление...')
  try {
    await sendNotification({
      title: 'ЭТО ТЕСТ',
      body: 'Если вы видите это, значит API работает.',
    })
    console.log('Команда на отправку уведомления выполнена без ошибок.')
  } catch (error) {
    console.error('ОШИБКА при вызове sendNotification:', error)
  }
}

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook-test/fleets'

async function sendToN8n(noteToSend: Note) {
  // Находим заметку в нашем списке, чтобы изменять ее реактивно
  const noteInList = notes.value.find((n) => n.id === noteToSend.id)
  if (!noteInList || noteInList.status === 'sending') {
    // Если заметки нет или она уже отправляется, ничего не делаем
    return
  }

  if (!N8N_WEBHOOK_URL.startsWith('http')) {
    alert('Пожалуйста, установите корректный Webhook URL для n8n в коде App.vue')
    return
  }

  try {
    // 1. Устанавливаем статус "отправка"
    noteInList.status = 'sending'

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteToSend.content, source: 'Fleets App' }),
    })

    if (!response.ok) {
      throw new Error(`Сервер n8n ответил ошибкой: ${response.status}`)
    }

    // 2. Успех: удаляем заметку и показываем уведомление
    notes.value = notes.value.filter((note) => note.id !== noteToSend.id)
    sendNotification({ title: 'Успешно!', body: 'Заметка отправлена в n8n.' })
    await showNotification('Успешно!', 'Заметка отправлена в n8n.')
  } catch (error) {
    console.error('Ошибка при отправке в n8n:', error)
    sendNotification({ title: 'Ошибка', body: 'Не удалось отправить заметку.' })
    await showNotification('Ошибка', 'Не удалось отправить заметку.')

    // 3. Ошибка: возвращаем статус 'idle', чтобы пользователь мог попробовать снова
    if (noteInList) {
      noteInList.status = 'idle'
    }
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
          v-for="note in notes"
          :key="note.id"
          class="group relative text-neutral-200 bg-black/20 rounded-md p-3 mb-2 whitespace-pre-wrap"
          :class="{ 'opacity-50': note.status === 'sending' }"
        >
          {{ note.content }}
          <Button
            v-if="note.status === 'idle'"
            @click="sendToN8n(note)"
            class="absolute top-2 right-2 p-1 rounded-md bg-neutral-700/50 text-neutral-300 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white"
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

          <div
            v-if="note.status === 'sending'"
            class="absolute top-2 right-2 p-1"
          >
            <svg
              class="animate-spin text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
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
      <Button
        @click="testNotification"
        class="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
      >
        Тест Уведомления
      </Button>
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
