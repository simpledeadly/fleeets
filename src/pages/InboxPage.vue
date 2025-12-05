<script setup lang="ts">
import { onMounted, computed, onUnmounted, ref } from 'vue'
import { Volume2, Loader2, Trash2, Check, Sparkles, RefreshCw } from 'lucide-vue-next'
import { useInboxStore } from '../stores/inbox'
import { speakText } from '../utils/tts'

const inbox = useInboxStore()
const currentCard = computed(() => inbox.queue[0])
const isLoadingAudio = ref(false)

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

const handleResolve = (action: 'accept' | 'reject') => {
  if (navigator.vibrate) navigator.vibrate(10) // Haptic feedback
  inbox.resolveCard(action)
}

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
</script>

<template>
  <div class="flex flex-col h-full w-full relative">
    <!-- HEADER -->
    <div class="flex justify-between items-center px-6 py-4 text-gray-500 shrink-0 z-10">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-purple-400" />
        <span class="text-xs font-bold uppercase tracking-widest opacity-70">AI Анализ</span>
      </div>
      <div
        v-if="inbox.queue.length > 0"
        class="bg-[#2c2c2e]/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-gray-300 border border-white/5"
      >
        {{ inbox.queue.length }} left
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <!-- LOADING -->
      <div
        v-if="inbox.loading"
        class="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4"
      >
        <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
        <span class="text-sm font-medium opacity-60">Синхронизация мыслей...</span>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="!currentCard"
        class="text-center space-y-6 animate-enter-up z-10"
      >
        <div class="text-6xl animate-float filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          🧘
        </div>
        <div class="space-y-2">
          <h3 class="text-2xl font-bold text-white tracking-tight">Входящие разобраны</h3>
          <p class="text-gray-400 max-w-[250px] mx-auto text-sm leading-relaxed">
            Наслаждайся пустотой или отправь новое голосовое боту.
          </p>
        </div>
        <button
          @click="inbox.fetchInbox()"
          class="group flex items-center gap-2 px-5 py-2.5 bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/5 hover:border-white/10 rounded-full text-sm font-medium transition-all text-gray-300 hover:text-white"
        >
          <RefreshCw class="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          <span>Проверить</span>
        </button>
      </div>

      <!-- CARD INTERFACE -->
      <Transition
        name="card"
        mode="out-in"
      >
        <div
          v-if="currentCard"
          :key="currentCard.content"
          class="w-full max-w-sm flex flex-col h-full max-h-[550px] relative"
        >
          <!-- AMBIENT GLOW (Дышащий фон) -->
          <div
            class="absolute inset-4 rounded-full blur-[80px] opacity-20 animate-pulse-slow pointer-events-none"
            :class="currentCard.type === 'task' ? 'bg-blue-500' : 'bg-purple-500'"
          ></div>

          <!-- THE CARD -->
          <div
            class="flex-1 bg-[#161618]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col relative group overflow-hidden z-10"
          >
            <!-- Card Header -->
            <div class="flex justify-between items-start mb-6 shrink-0">
              <div class="flex flex-wrap gap-2">
                <!-- Type Badge -->
                <span
                  class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                  :class="
                    currentCard.type === 'task'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  "
                >
                  {{
                    currentCard.type === 'task'
                      ? 'Задача'
                      : currentCard.type === 'idea'
                      ? 'Идея'
                      : 'Заметка'
                  }}
                </span>
                <!-- Tags -->
                <span
                  v-for="tag in currentCard.tags"
                  :key="tag"
                  class="px-2 py-1 rounded-full bg-[#2c2c2e] text-[10px] font-medium text-gray-400 border border-white/5"
                >
                  #{{ tag }}
                </span>
              </div>

              <!-- TTS Button -->
              <button
                @click="handleSpeak"
                :disabled="isLoadingAudio"
                class="w-9 h-9 flex items-center justify-center rounded-full bg-[#2c2c2e] text-gray-400 hover:text-white hover:bg-[#3a3a3c] transition-colors border border-white/5 disabled:opacity-50"
              >
                <Loader2
                  v-if="isLoadingAudio"
                  class="w-4 h-4 animate-spin text-blue-400"
                />
                <Volume2
                  v-else
                  class="w-4 h-4"
                />
              </button>
            </div>

            <!-- Card Content -->
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <p class="text-[22px] text-white font-medium leading-relaxed tracking-tight">
                {{ currentCard.content }}
              </p>
            </div>

            <!-- Bottom Fade -->
            <div
              class="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#161618] to-transparent pointer-events-none"
            ></div>
          </div>

          <!-- ACTIONS -->
          <div class="grid grid-cols-2 gap-4 mt-6 shrink-0 z-10">
            <button
              @click="handleResolve('reject')"
              class="group flex flex-col items-center justify-center p-4 rounded-3xl bg-[#1c1c1e] border border-white/5 text-gray-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all active:scale-95"
            >
              <Trash2 class="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
              <span
                class="text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100"
                >Удалить</span
              >
            </button>

            <button
              @click="handleResolve('accept')"
              class="group flex flex-col items-center justify-center p-4 rounded-3xl bg-white text-black hover:bg-gray-100 transition-all active:scale-95 shadow-[0_0_30px_-5px_rgba(255,255,255,0.15)]"
            >
              <Check class="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
              <span
                class="text-xs font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100"
                >Принять</span
              >
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.card-enter-active,
.card-leave-active {
  transition: all 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.card-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}
.card-leave-to {
  opacity: 0;
  transform: scale(1.05) translateY(-20px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3a3a3c;
  border-radius: 4px;
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

.animate-pulse-slow {
  animation: pulseSlow 8s ease-in-out infinite;
}
@keyframes pulseSlow {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.1);
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
