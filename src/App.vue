<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api'
import { getCurrent } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { Textarea } from './components/ui/textarea'

// --- СОСТОЯНИЕ ---
const noteContent = ref('')
const zoomLevel = ref(1.0)
const ZOOM_STEP = 0.1
const appWindow = getCurrent()

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
</script>

<template>
  <div
    @mousedown="appWindow.startDragging()"
    class="h-screen cursor-grab flex items-center justify-center p-4"
  >
    <div
      @mousedown="appWindow.startDragging()"
      class="main-container relative overflow-hidden w-full max-w-xl bg-neutral-950 rounded-xl p-4 cursor-grab flex flex-col gap-3"
    >
      <Textarea
        @mousedown.stop
        v-model="noteContent"
        @input="saveNote"
        placeholder="Начните печатать вашу заметку..."
        spellcheck="false"
        autofocus
        class="h-64 flex-grow bg-transparent text-lg text-neutral-100 placeholder:text-neutral-500 border-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 resize-none leading-relaxed cursor-text"
      />
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
