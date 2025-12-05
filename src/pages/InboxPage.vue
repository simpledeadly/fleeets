<script setup lang="ts">
import { onMounted, computed, onUnmounted, ref } from 'vue'
import { Volume2, Loader2, X, Check, RefreshCw, Layers } from 'lucide-vue-next'
import { useInboxStore } from '../stores/inbox'
import { speakText } from '../utils/tts'

const inbox = useInboxStore()
const isLoadingAudio = ref(false)

// Состояние анимации
const isAnimating = ref(false)
const exitDirection = ref<'left' | 'right' | null>(null)

// Берем топ-3 карточки для эффекта стопки
const visibleCards = computed(() => inbox.queue.slice(0, 3))

const handleKeydown = (e: KeyboardEvent) => {
  if (isAnimating.value) return
  if (e.key === 'ArrowRight' || e.key === 'Enter') triggerSwipe('right')
  if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'Delete') triggerSwipe('left')
}

onMounted(() => {
  inbox.fetchInbox()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Логика "Свайпа"
const triggerSwipe = async (direction: 'left' | 'right') => {
  if (inbox.queue.length === 0 || isAnimating.value) return

  // 1. Запускаем анимацию
  isAnimating.value = true
  exitDirection.value = direction

  if (navigator.vibrate) navigator.vibrate(15) // Тактильный отклик

  // 2. Ждем окончания CSS анимации (300ms)
  await new Promise((resolve) => setTimeout(resolve, 300))

  // 3. Удаляем из стора (реальное действие)
  const action = direction === 'right' ? 'accept' : 'reject'
  await inbox.resolveCard(action)

  // 4. Сбрасываем состояние
  isAnimating.value = false
  exitDirection.value = null
}

const handleSpeak = async (text: string) => {
  if (isLoadingAudio.value) return
  isLoadingAudio.value = true
  try {
    await speakText(text)
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingAudio.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full w-full relative">
    <!-- HEADER -->
    <div class="flex justify-between items-center px-6 py-4 shrink-0 z-20">
      <div class="flex items-center gap-2 text-gray-500">
        <Layers class="w-4 h-4 text-blue-400" />
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">AI Stack</span>
      </div>
      <div
        v-if="inbox.queue.length > 0"
        class="text-[10px] font-mono text-gray-400"
      >
        {{ inbox.queue.length }} cards
      </div>
    </div>

    <!-- MAIN AREA -->
    <div class="flex-1 relative flex flex-col items-center justify-center w-full perspective-1000">
      <!-- LOADING -->
      <div
        v-if="inbox.loading && inbox.queue.length === 0"
        class="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4"
      >
        <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="inbox.queue.length === 0"
        class="text-center space-y-6 animate-enter-up z-10"
      >
        <div
          class="text-6xl animate-float filter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] opacity-80"
        >
          ✨
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-bold text-white tracking-tight">Всё чисто</h3>
          <p class="text-gray-500 text-xs uppercase tracking-widest">Inbox Zero</p>
        </div>
        <button
          @click="inbox.fetchInbox()"
          class="group px-6 py-2 bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/5 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-all"
        >
          <RefreshCw
            class="w-3 h-3 inline mr-2 group-hover:rotate-180 transition-transform duration-500"
          />
          ОБНОВИТЬ
        </button>
      </div>

      <!-- CARD STACK -->
      <div
        v-else
        class="relative w-full max-w-[340px] h-[420px] flex items-center justify-center"
      >
        <div
          v-for="(card, index) in visibleCards"
          :key="card._dbId || index"
          class="absolute w-full h-full bg-[#161618] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform origin-bottom"
          :class="[
            index === 0 ? 'z-30 cursor-grab active:cursor-grabbing' : '',
            index === 1 ? 'z-20 opacity-60' : '',
            index === 2 ? 'z-10 opacity-30' : '',
            // Анимация выхода для первой карточки
            index === 0 && exitDirection === 'left' ? 'animate-swipe-left' : '',
            index === 0 && exitDirection === 'right' ? 'animate-swipe-right' : '',
          ]"
          :style="{
            transform:
              index === 0 && !exitDirection
                ? 'scale(1) translateY(0)'
                : `scale(${1 - index * 0.05}) translateY(${index * 15}px)`,
          }"
        >
          <!-- GLOW EFFECT BEHIND TEXT -->
          <div
            class="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br rounded-full blur-[50px] opacity-20 pointer-events-none"
            :class="
              card.type === 'task'
                ? 'from-blue-500 to-cyan-500'
                : card.type === 'idea'
                ? 'from-green-500 to-emerald-500'
                : 'from-purple-500 to-pink-500'
            "
          ></div>

          <!-- CARD HEADER -->
          <div class="flex justify-between items-start mb-6 relative z-10">
            <div class="flex flex-wrap gap-2">
              <!-- Minimal Badge -->
              <div
                class="h-5 px-2.5 rounded-full flex items-center justify-center border text-[9px] font-bold uppercase tracking-wider"
                :class="
                  card.type === 'task'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : card.type === 'idea'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                "
              >
                {{ card.type === 'task' ? 'ЗАДАЧА' : card.type === 'idea' ? 'ИДЕЯ' : 'ЗАМЕТКА' }}
              </div>
            </div>

            <button
              @click.stop="handleSpeak(card.content)"
              :disabled="isLoadingAudio"
              class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Loader2
                v-if="isLoadingAudio && index === 0"
                class="w-3.5 h-3.5 animate-spin"
              />
              <Volume2
                v-else
                class="w-3.5 h-3.5"
              />
            </button>
          </div>

          <!-- CONTENT -->
          <div class="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <p class="text-[20px] leading-relaxed font-medium text-white/90">
              {{ card.content }}
            </p>
          </div>

          <!-- TAGS (Bottom) -->
          <div
            v-if="card.tags && card.tags.length"
            class="mt-6 flex flex-wrap gap-1.5 relative z-10"
          >
            <span
              v-for="tag in card.tags"
              :key="tag"
              class="text-[9px] font-medium text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- CONTROLS (Floating Bottom Bar) -->
      <div
        v-if="inbox.queue.length > 0"
        class="absolute bottom-6 flex items-center gap-6 z-40"
      >
        <!-- REJECT BTN -->
        <button
          @click="triggerSwipe('left')"
          :disabled="isAnimating"
          class="group w-14 h-14 rounded-full bg-[#1c1c1e]/80 backdrop-blur border border-white/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:scale-110 active:scale-95 transition-all duration-300 shadow-lg"
        >
          <X class="w-6 h-6 stroke-[2.5]" />
        </button>

        <!-- INFO / HINT -->
        <div
          class="text-[10px] font-medium text-gray-600 uppercase tracking-widest pointer-events-none"
        >
          Swipe
        </div>

        <!-- ACCEPT BTN -->
        <button
          @click="triggerSwipe('right')"
          :disabled="isAnimating"
          class="group w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:bg-blue-50 hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <Check class="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 3D Perspective */
.perspective-1000 {
  perspective: 1000px;
}

/* АНИМАЦИИ ВЫХОДА (SWIPE) */
@keyframes swipeRight {
  0% {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
  100% {
    transform: translateX(120%) rotate(15deg);
    opacity: 0;
  }
}

@keyframes swipeLeft {
  0% {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
  100% {
    transform: translateX(-120%) rotate(-15deg);
    opacity: 0;
  }
}

.animate-swipe-right {
  animation: swipeRight 0.3s ease-in forwards;
}

.animate-swipe-left {
  animation: swipeLeft 0.3s ease-in forwards;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-enter-up {
  animation: enterUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes enterUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
