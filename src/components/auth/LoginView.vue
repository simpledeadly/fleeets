<script setup lang="ts">
import { ref } from 'vue'
import { Zap, ArrowRight, Mail } from 'lucide-vue-next'
import TelegramLogin from '../TelegramLogin.vue'
import AuroraBackground from './AuroraBackground.vue'
import { useAuth } from '../../composables/useAuth'

const { handleTelegramLogin, handleEmailLogin, emailLoading } = useAuth()
const email = ref('')

// --- Логика Авроры теперь здесь ---
const auroraHue = ref(220)
const auroraSat = ref(80)

const randomizeAurora = () => {
  auroraHue.value = Math.floor(Math.random() * 360)
  auroraSat.value = 60 + Math.floor(Math.random() * 40)
}
// ---------------------------------

const onEmailSubmit = () => {
  if (email.value) handleEmailLogin(email.value)
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6 relative z-10 overflow-hidden">
    <!-- Передаем параметры через props -->
    <AuroraBackground
      :hue="auroraHue"
      :sat="auroraSat"
    />

    <div class="w-full max-w-sm flex flex-col items-center gap-8 relative z-20">
      <div
        class="text-center space-y-4 animate-enter-up"
        style="animation-delay: 0ms"
      >
        <div
          @click="randomizeAurora"
          class="cursor-pointer animate-float inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#18181b] border border-[#333] shadow-2xl mb-2 group"
        >
          <Zap class="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.2)]" />
        </div>
        <div>
          <h1 class="text-4xl font-bold tracking-tighter text-white">Fleeets</h1>
          <p class="text-[#888] text-sm mt-2 tracking-wide">Ловите мысли молниеносно.</p>
        </div>
      </div>

      <div
        class="w-full animate-enter-up"
        style="animation-delay: 100ms"
      >
        <div
          class="bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex justify-center hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 shadow-lg cursor-pointer group"
        >
          <div class="opacity-90 group-hover:opacity-100 transition-opacity">
            <TelegramLogin
              botName="fleeets_auth_bot"
              @login="handleTelegramLogin"
            />
          </div>
        </div>
      </div>

      <div
        class="flex items-center gap-4 w-full opacity-40 px-2 animate-enter-up"
        style="animation-delay: 200ms"
      >
        <div
          class="h-px bg-gradient-to-r from-transparent via-[#52525b] to-transparent flex-1"
        ></div>
        <span class="text-[10px] uppercase tracking-widest text-[#a1a1aa] select-none">или</span>
        <div
          class="h-px bg-gradient-to-r from-transparent via-[#52525b] to-transparent flex-1"
        ></div>
      </div>

      <div
        class="w-full relative group animate-enter-up"
        style="animation-delay: 300ms"
      >
        <Mail
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1aa] transition-colors duration-300 group-focus-within:text-white z-20"
        />
        <input
          v-model="email"
          placeholder="name@example.com"
          @keydown.enter="onEmailSubmit"
          class="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl py-4 pl-12 pr-14 text-white placeholder-[#52525b] outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all duration-300 shadow-lg"
        />
        <button
          @click="onEmailSubmit"
          :disabled="emailLoading || !email"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all duration-300 active:scale-90 z-20"
          :class="
            email
              ? 'bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
              : 'text-[#52525b] bg-white/5 cursor-not-allowed'
          "
        >
          <ArrowRight
            v-if="!emailLoading"
            class="w-4 h-4 stroke-[3]"
          />
          <div
            v-else
            class="w-4 h-4 border-2 border-[#555] border-t-[#888] rounded-full animate-spin"
          ></div>
        </button>
      </div>
    </div>
  </div>
</template>
