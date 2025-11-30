<script setup lang="ts">
import { ref, computed } from 'vue'
import { Paperclip, ArrowUp } from 'lucide-vue-next'

const props = defineProps<{
  isComfortMode: boolean
  isTauri: boolean
}>()

const emit = defineEmits(['submit'])

const newNoteContent = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const hasAttachment = ref(false)

const canSubmit = computed(() => newNoteContent.value.trim().length > 0 || hasAttachment.value)

const triggerFileUpload = () => fileInput.value?.click()
const onFileChange = () => {
  hasAttachment.value = !!fileInput.value?.files?.length
}

const submitNote = () => {
  if (!canSubmit.value) return
  const file = fileInput.value?.files?.[0]
  emit('submit', { content: newNoteContent.value, file })

  newNoteContent.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
    hasAttachment.value = false
  }
}
</script>

<template>
  <div
    class="shrink-0 z-30 border-t border-[#27272a] bg-[#0c0c0e]"
    :class="[
      props.isComfortMode ? 'px-4 md:px-[15%] lg:px-[25%] py-0' : 'px-2 py-0',
    ]"
  >
    <div class="flex items-center gap-1.5 bg-transparent transition-all duration-100">
      <button
        @click="triggerFileUpload"
        class="p-2 rounded-full transition-all duration-100 flex items-center justify-center hover:scale-105 active:scale-95"
        :class="
          hasAttachment
            ? 'text-black bg-white'
            : 'text-[#71717a] hover:text-white hover:bg-[#1c1c1f]'
        "
      >
        <Paperclip
          class="w-4 h-4"
          strokeWidth="1.8"
        />
      </button>
      <input
        ref="fileInput"
        type="file"
        hidden
        @change="onFileChange"
      />
      <textarea
        v-model="newNoteContent"
        @keydown.enter.exact.prevent="submitNote"
        rows="1"
        class="flex-1 bg-transparent resize-none outline-none text-md py-3 md:py-2 max-h-40 placeholder-[#52525b] text-white font-medium leading-relaxed"
        placeholder="Введите текст заметки"
      ></textarea>
      <button
        @click="submitNote"
        class="p-2 rounded-full transition-all duration-100 flex items-center justify-center active:scale-90 shadow-sm"
        :class="
          canSubmit
            ? 'bg-white text-black hover:bg-[#e4e4e7] shadow-[0_0_15px_rgba(255,255,255,0.15)]'
            : 'bg-[#1c1c1f] text-[#52525b] hover:bg-[#27272a] hover:text-[#a1a1aa]'
        "
        :disabled="!canSubmit"
      >
        <ArrowUp
          class="w-4 h-4"
          strokeWidth="2"
        />
      </button>
    </div>
  </div>
</template>
