<script setup lang="ts">
import { onMounted, computed, onUnmounted, ref } from 'vue'
import { useInboxStore } from '../stores/inbox'
import { speakText } from '../utils/tts'

const inbox = useInboxStore()
const currentCard = computed(() => inbox.queue[0])
const isLoadingAudio = ref(false)

// Хоткеи для десктопа
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') handleResolve('accept')
  if (e.key === 'Backspace' || e.key === 'Delete') handleResolve('reject')
}

onMounted(() => {
  inbox.fetchInbox()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleSpeak = async () => {
  if (isLoadingAudio.value) return
  isLoadingAudio.value = true

  try {
    await speakText(currentCard.value.content)
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingAudio.value = false
  }
}

const handleResolve = (action: 'accept' | 'reject') => {
  inbox.resolveCard(action)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full w-full p-6 relative">
    <!-- Заголовок -->
    <div class="absolute top-0 left-0 w-full p-4 flex justify-between items-center text-gray-500">
      <h2 class="text-sm font-medium uppercase tracking-widest">Входящие (AI)</h2>
      <span v-if="inbox.queue.length > 0">{{ inbox.queue.length }} шт.</span>
    </div>

    <!-- Состояние загрузки -->
    <div
      v-if="inbox.loading"
      class="animate-pulse text-gray-500"
    >
      Анализируем мысли...
    </div>

    <!-- Пустой инбокс -->
    <div
      v-else-if="!currentCard"
      class="text-center space-y-4"
    >
      <div class="text-6xl">🧘</div>
      <h3 class="text-2xl font-bold text-white">Пустота и порядок</h3>
      <p class="text-gray-400 max-w-xs mx-auto">
        Отправь голосовое боту, чтобы здесь что-то появилось.
      </p>
      <button
        @click="inbox.fetchInbox()"
        class="text-sm text-blue-400 hover:underline mt-4"
      >
        Проверить обновления
      </button>
    </div>

    <!-- Карточка -->
    <div
      v-else
      class="w-full max-w-md bg-[#1A1A1A] border border-gray-800 rounded-2xl p-8 shadow-2xl transform transition-all hover:scale-[1.01]"
    >
      <!-- Тип -->
      <div class="flex items-center gap-2 mb-6">
        <div
          class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          :class="
            currentCard.type === 'task'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-purple-500/20 text-purple-400'
          "
        >
          {{
            currentCard.type === 'task'
              ? 'Задача'
              : currentCard.type === 'idea'
              ? 'Идея'
              : 'Заметка'
          }}
        </div>
        <div
          v-if="currentCard.tags"
          class="flex gap-2"
        >
          <span
            v-for="tag in currentCard.tags"
            :key="tag"
            class="text-xs text-gray-500"
            >#{{ tag }}</span
          >
        </div>
      </div>

      <!-- Текст -->
      <p class="text-2xl text-white font-medium leading-normal mb-10">
        {{ currentCard.content }}
      </p>

      <!-- Действия -->
      <div class="grid grid-cols-3 gap-4">
        <!-- Обновленная кнопка с загрузкой и стилями -->
        <button
          @click="handleSpeak"
          :disabled="isLoadingAudio"
          class="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-900 text-gray-400 hover:bg-blue-900/20 hover:text-blue-400 transition group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <!-- Иконка меняется при загрузке -->
          <span class="text-lg mb-1 group-hover:scale-110 transition">
            {{ isLoadingAudio ? '⏳' : '🔊' }}
          </span>
          <span class="text-xs font-bold">
            {{ isLoadingAudio ? 'Жди...' : 'Слушать' }}
          </span>
          <span class="text-[10px] opacity-50 mt-1">TTS</span>
        </button>

        <!-- Кнопки Удалить и Принять (оставляем без изменений) -->
        <button
          @click="handleResolve('reject')"
          class="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-900 text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition group"
        >
          <span class="text-lg mb-1 group-hover:scale-110 transition">🗑</span>
          <span class="text-xs font-bold">Удалить</span>
          <span class="text-[10px] opacity-50 mt-1">Del</span>
        </button>

        <button
          @click="handleResolve('accept')"
          class="flex flex-col items-center justify-center p-4 rounded-xl bg-white text-black hover:bg-gray-200 transition group"
        >
          <span class="text-lg mb-1 group-hover:scale-110 transition">⚡️</span>
          <span class="text-xs font-bold">Принять</span>
          <span class="text-[10px] opacity-50 mt-1">Enter</span>
        </button>
      </div>
    </div>
  </div>
</template>
