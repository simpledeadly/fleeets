<!-- File: src/App.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api'
import { appWindow } from '@tauri-apps/api/window'
import type { Event } from '@tauri-apps/api/event'
import { checkUpdate, onUpdaterEvent } from '@tauri-apps/api/updater'

async function checkForUpdates() {
  try {
    const { shouldUpdate, manifest } = await checkUpdate()
    if (shouldUpdate) {
      // Tauri автоматически покажет диалог, так как "dialog": true в конфиге.
      // Эта часть кода нужна для более сложной логики, например, для показа кастомного окна.
      console.log(
        `Устанавливается обновление ${manifest?.version}, скачивается с ${manifest?.body}`
      )
    }
  } catch (error) {
    console.error('Ошибка при проверке обновлений:', error)
  }
}

const noteContent = ref('')

const saveNote = async () => {
  await invoke('save_note', { content: noteContent.value })
}

const loadNote = async () => {
  noteContent.value = await invoke<string>('load_note')
}

onMounted(async () => {
  await checkForUpdates()

  loadNote()

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      appWindow.hide()
    }
  })

  appWindow.onFocusChanged((event: Event<boolean>) => {
    const focused = event.payload
    if (!focused) {
      appWindow.hide()
    }
  })
})
</script>

<template>
  <div class="container">
    <textarea
      v-model="noteContent"
      @input="saveNote"
      placeholder="Начните печатать вашу заметку..."
      spellcheck="false"
      autofocus
    ></textarea>
    <footer class="status-bar">
      <p>Нажмите Esc или кликните вне окна, чтобы скрыть</p>
    </footer>
  </div>
</template>

<style>
:root {
  --bg-color: #ffffff;
  --text-color: #1e1e1e;
  --footer-bg-color: #f5f5f7;
  /* --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; */
  --font-family: 'Copperplate';
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #181818;
    --text-color: #f0f0f0;
    --footer-bg-color: #222;
  }
}
html,
body,
#app,
.container {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: var(--font-family);
}
body {
  background-color: var(--bg-color);
}
.container {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: var(--text-color);
}
textarea {
  flex-grow: 1;
  width: 100%;
  padding: 20px;
  font-size: 28px;
  line-height: 1.4;
  font-family: 'Copperplate';
  border: none;
  outline: none;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color);
  box-sizing: border-box;
  caret-color: chartreuse;
}
textarea::placeholder {
  color: var(--text-color);
  opacity: 0.4;
}
.status-bar {
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0.6;
  background-color: var(--footer-bg-color);
  color: var(--text-color);
  border-top: 1px solid rgba(128, 128, 128, 0.1);
}
</style>
