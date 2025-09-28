<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue' // Добавили жизненные циклы
import { getCurrent } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { fetch as tauriFetch, Body } from '@tauri-apps/api/http'
import { sendNotification } from '@tauri-apps/api/notification' // Убрали лишние импорты
import { Textarea } from './components/ui/textarea'
import { Button } from './components/ui/button'

// --- ИНТЕРФЕЙС И СОСТОЯНИЕ ---
interface Note {
  id: number
  content: string
  status: 'idle' | 'sending'
}
const notes = ref<Note[]>([]) // Восстанавливаем список заметок
const noteContent = ref('')
const appWindow = getCurrent()

// --- URL ДЛЯ N8N (возьмите их из своего n8n) ---
const N8N_ANALYZE_URL = 'http://localhost:5678/webhook-test/analyze-intent'
const N8N_ACTION_URL = 'http://localhost:5678/webhook/process-note'

// --- СОСТОЯНИЕ ДЛЯ AI ---
const detectedIntent = ref<'Task' | 'Event' | 'Note'>('Note')
// ИСПРАВЛЕНО: Правильный тип для таймера в среде Node.js
let debounceTimer: NodeJS.Timeout

// --- АНАЛИЗ НАМЕРЕНИЯ ---
async function analyzeIntent(text: string): Promise<'Task' | 'Event' | 'Note'> {
  if (!N8N_ANALYZE_URL.startsWith('http')) return 'Note'
  try {
    const response = await tauriFetch(N8N_ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Body.json({ text }),
    })
    if (!response.ok) return 'Note'
    const result = (await response.data) as { data: string }
    const intent = result.data.trim()
    if (['Task', 'Event', 'Note'].includes(intent)) {
      return intent as any
    }
    return 'Note'
  } catch (error) {
    console.error('n8n analysis failed:', error)
    return 'Note'
  }
}

// --- СЛЕЖЕНИЕ ЗА ВВОДОМ ---
watch(noteContent, (newText) => {
  clearTimeout(debounceTimer)
  const trimmedText = newText.trim()
  if (trimmedText.length > 5) {
    debounceTimer = setTimeout(async () => {
      detectedIntent.value = await analyzeIntent(trimmedText)
    }, 700)
  } else {
    detectedIntent.value = 'Note'
  }
})

// --- ОТПРАВКА ДЕЙСТВИЯ ---
async function submitAction() {
  const content = noteContent.value.trim()
  if (!content || !N8N_ACTION_URL.startsWith('http')) return

  try {
    const response = await tauriFetch(N8N_ACTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Body.json({ intent: detectedIntent.value, text: content }),
    })
    if (!response.ok) throw new Error('n8n action webhook failed')

    // Вместо того чтобы просто очищать поле, давайте добавим заметку в наш локальный список
    notes.value.unshift({ id: Date.now(), content, status: 'idle' })
    noteContent.value = ''
    detectedIntent.value = 'Note'
    await sendNotification({
      title: 'Отправлено!',
      body: `Заметка отправлена в n8n как "${detectedIntent.value}"`,
    })
  } catch (error) {
    console.error('n8n action failed:', error)
    await sendNotification({ title: 'Ошибка', body: 'Не удалось выполнить действие.' })
  }
}

// --- УПРАВЛЕНИЕ ОКНОМ И ЖИЗНЕННЫЙ ЦИКЛ (восстановлено) ---
const hideWindow = () => appWindow.hide()
const showWindow = async () => {
  await appWindow.show()
  await appWindow.center()
  await appWindow.setFocus()
}
async function toggleWindow() {
  ;(await appWindow.isVisible()) ? hideWindow() : showWindow()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    hideWindow()
  }
}

onMounted(() => {
  listen('toggle-window', toggleWindow)
  window.addEventListener('keydown', handleKeyDown)
  appWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused) hideWindow()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
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
            <path d="M3 6h18" />
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>

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
          @keydown.enter.prevent="submitAction"
          placeholder="Начните печатать вашу заметку..."
          spellcheck="false"
          autofocus
          rows="1"
          class="bg-neutral-950 text-lg text-neutral-100 placeholder:text-neutral-500 rounded-lg resize-none overflow-hidden border border-neutral-800 ring-offset-neutral-950 focus-visible:ring-0 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        />
      </div>

      <div
        class="flex items-center justify-center p-2"
        v-if="noteContent.trim()"
      >
        <!-- 
          Теперь у нас одна "умная" кнопка, которая меняет свой вид и текст,
          но всегда вызывает одну и ту же функцию submitAction().
        -->
        <Button
          @click="submitAction"
          class="...[динамические стили]..."
        >
          <span v-if="detectedIntent === 'Event'">🗓️ Создать событие</span>
          <span v-if="detectedIntent === 'Task'">✅ Создать задачу</span>
          <span v-if="detectedIntent === 'Note'">📝 Сохранить заметку</span>
        </Button>
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
