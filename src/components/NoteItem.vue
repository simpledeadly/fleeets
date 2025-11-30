<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { type Note } from '../stores/notes'
import { Trash2, Download, FileText } from 'lucide-vue-next'

// Импорты Tauri (они сработают только внутри приложения)
import { writeBinaryFile } from '@tauri-apps/api/fs'
import { save } from '@tauri-apps/api/dialog'

const props = defineProps<{
  note: Note
  fullWidth?: boolean
}>()
const emit = defineEmits(['update', 'delete'])

const textarea = ref<HTMLTextAreaElement | null>(null)
const localContent = ref(props.note.content)

const adjustHeight = () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto'
    textarea.value.style.height = textarea.value.scrollHeight + 'px'
  }
}

onMounted(adjustHeight)
watch(localContent, adjustHeight)

const onBlur = () => emit('update', props.note.id, localContent.value)

// Умное скачивание (Web + Desktop)
const downloadFile = async () => {
  if (!props.note.file_url) return

  try {
    // 1. Скачиваем сам файл в память (Blob)
    const response = await fetch(props.note.file_url)
    const blob = await response.blob()
    const fileName = props.note.file_name || 'download'

    // Проверяем, запущены ли мы в Tauri
    // @ts-ignore
    const isTauri = window.__TAURI__ !== undefined

    if (isTauri) {
      // --- ЛОГИКА ДЛЯ DESKTOP ---

      // Превращаем Blob в массив байтов
      const buffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)

      // Открываем системное окно "Сохранить как"
      const filePath = await save({
        defaultPath: fileName,
        filters: [
          {
            name: 'Файл',
            extensions: [fileName.split('.').pop() || '*'],
          },
        ],
      })

      // Если пользователь выбрал путь - сохраняем
      if (filePath) {
        await writeBinaryFile(filePath, uint8Array)
        // Можно добавить уведомление об успехе, если хочешь
      }
    } else {
      // --- ЛОГИКА ДЛЯ WEB (Старая) ---
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  } catch (e) {
    console.error('Ошибка скачивания:', e)
    // Фоллбек: открыть в новой вкладке
    window.open(props.note.file_url, '_blank')
  }
}
</script>

<template>
  <!-- Разделитель: border-b -->
  <div
    class="px-4 py-2 group relative border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors duration-50"
  >
    <!-- Кнопка УДАЛЕНИЯ -->
    <button
      @click="emit('delete', note.id)"
      class="absolute right-0 top-0 opacity-0 pr-3 pt-3 group-hover:opacity-100 text-neutral-500 hover:text-red-500 transition-all duration-50 z-10"
      title="Удалить"
    >
      <Trash2 class="w-4 h-4" />
    </button>

    <!-- КАРТИНКА -->
    <div
      v-if="note.file_url && note.file_type === 'image'"
      class="mb-3"
    >
      <img
        :src="note.file_url"
        class="rounded-lg max-h-[500px] w-[150px] object-cover bg-surface border border-white/5"
      />
    </div>

    <!-- ФАЙЛ -->
    <div
      v-if="note.file_url && note.file_type === 'file'"
      class="mb-3"
    >
      <div
        class="bg-surface rounded border border-white/5 p-3 flex items-center justify-between gap-3 max-w-sm transition-all duration-50 hover:border-white/10"
      >
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="bg-white/5 text-blue-400 p-2.5 rounded-full">
            <FileText class="w-5 h-5" />
          </div>
          <div class="flex flex-col overflow-hidden">
            <span class="text-sm truncate text-white font-medium">{{
              note.file_name || 'Вложение'
            }}</span>
            <span class="text-[10px] text-dim uppercase">Файл</span>
          </div>
        </div>
        <button
          @click="downloadFile"
          class="text-dim hover:text-white p-2 rounded-full hover:bg-white/10 transition-all duration-50"
          title="Скачать"
        >
          <Download class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- ТЕКСТ -->
    <textarea
      ref="textarea"
      v-model="localContent"
      @input="adjustHeight"
      @blur="onBlur"
      class="w-full font-medium bg-transparent text-white/90 resize-none outline-none border-none p-0 text-base leading-relaxed placeholder-dim/30 overflow-hidden block"
      rows="1"
      spellcheck="false"
      placeholder="Пустая заметка..."
    ></textarea>
  </div>
</template>
