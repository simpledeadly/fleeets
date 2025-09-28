<!-- File: src/App.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api'
import { appWindow } from '@tauri-apps/api/window'
import type { Event } from '@tauri-apps/api/event'

const noteContent = ref('')

const saveNote = async () => {
  await invoke('save_note', { content: noteContent.value })
}

const loadNote = async () => {
  noteContent.value = await invoke<string>('load_note')
}

onMounted(() => {
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
  <UApp>
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
  </UApp>
</template>

<style>
:root {
  --bg-color: #ffffff;
  --text-color: #1e1e1e;
  --footer-bg-color: #f5f5f7;
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1e1e1e;
    --text-color: #f0f0f0;
    --footer-bg-color: #252526;
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
  font-size: 16px;
  line-height: 1.6;
  border: none;
  outline: none;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color);
  box-sizing: border-box;
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
  font-size: 12px;
  opacity: 0.6;
  background-color: var(--footer-bg-color);
  color: var(--text-color);
  border-top: 1px solid rgba(128, 128, 128, 0.1);
}
</style>
