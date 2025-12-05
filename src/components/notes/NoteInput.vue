<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Zap, Paperclip, X } from 'lucide-vue-next'

defineProps<{
  isComfortMode?: boolean
  isTauri?: boolean
}>()

const emit = defineEmits(['submit'])

const content = ref('')
const file = ref<File | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const autoResize = () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

const handleEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) submit()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) file.value = target.files[0]
}

const removeFile = () => {
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const submit = () => {
  if (!content.value.trim() && !file.value) return
  emit('submit', { content: content.value, file: file.value })
  content.value = ''
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = 'auto'
  })
}
</script>

<template>
  <div class="w-full flex items-end gap-3 relative group">
    <!-- INPUT CONTAINER (GLASS STYLE) -->
    <!-- Используем стили как в LoginView: bg-[#0a0a0a]/40 + backdrop-blur -->
    <div
      class="flex-1 relative bg-[#1a1a1a]/80 backdrop-blur-md rounded-[24px] border border-white/[0.08] focus-within:border-white/20 focus-within:bg-[#1a1a1a]/70 transition-all duration-100 ease-out shadow-2xl"
    >
      <!-- Прикрепленный файл -->
      <div
        v-if="file"
        class="absolute -top-10 left-0 bg-[#0a0a0a]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 animate-spring-up shadow-lg"
      >
        <Paperclip class="w-3 h-3 text-blue-400" />
        <span class="text-xs text-gray-200 max-w-[150px] truncate">{{ file.name }}</span>
        <button
          @click="removeFile"
          class="hover:text-red-400 transition-colors"
        >
          <X class="w-3 h-3" />
        </button>
      </div>

      <textarea
        ref="textareaRef"
        v-model="content"
        rows="1"
        placeholder="Новая заметка..."
        class="w-full bg-transparent text-white placeholder-white/30 text-[15px] px-5 py-3.5 min-h-[48px] max-h-[160px] resize-none focus:outline-none custom-scrollbar leading-relaxed font-medium"
        @keydown.enter.prevent="handleEnter"
        @input="autoResize"
      ></textarea>

      <!-- ATTACH BUTTON -->
      <button
        @click="fileInput?.click()"
        class="absolute right-2 bottom-1.5 p-2 rounded-full transition-all duration-200 active:scale-90"
        :class="
          file ? 'text-blue-400 bg-blue-500/10' : 'text-white/30 hover:text-white hover:bg-white/10'
        "
      >
        <Paperclip class="w-4 h-4" />
      </button>
    </div>

    <!-- SEND BUTTON (GLASS + GLOW) -->
    <button
      @click="submit"
      :disabled="!content.trim() && !file"
      class="w-12 h-12 shrink-0 flex items-center justify-center rounded-full transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) border"
      :class="
        content.trim() || file
          ? 'bg-white/5 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.1)] backdrop-blur-md'
          : 'bg-white/[0.02] border-white/5 text-white/10 cursor-default backdrop-blur-sm'
      "
    >
      <Zap
        class="w-6 h-6 stroke-[1.5] fill-current"
        :class="{ 'opacity-30': !content.trim() && !file }"
      />
    </button>

    <input
      type="file"
      ref="fileInput"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
}
@keyframes springUp {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.9);
  }
  60% {
    transform: translateY(-3px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.animate-spring-up {
  animation: springUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
</style>
