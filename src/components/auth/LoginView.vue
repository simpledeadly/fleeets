<script setup lang="ts">
import { ref } from 'vue'
import { Zap, ArrowRight, Mail } from 'lucide-vue-next'
import TelegramLogin from '../TelegramLogin.vue'
import AuroraBackground from './AuroraBackground.vue'
import { useAuth } from '../../composables/useAuth'

const emit = defineEmits(['login-telegram'])

const { handleEmailLogin, emailLoading } = useAuth()
const email = ref('')

// Настройки "Авроры" подстраиваем под скриншот (более темные, глубокие тона)
const auroraHue = ref(240) // Сине-фиолетовый
const auroraSat = ref(60)

const randomizeAurora = () => {
  auroraHue.value = Math.floor(Math.random() * 360)
  auroraSat.value = 60 + Math.floor(Math.random() * 40)
}

const onTelegramAuth = (tgUser: any) => {
  emit('login-telegram', tgUser)
}

const onEmailSubmit = () => {
  if (email.value) handleEmailLogin(email.value)
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6 relative z-10 overflow-hidden">
    <!-- Фон (Aurora) -->
    <AuroraBackground
      :hue="auroraHue"
      :sat="auroraSat"
    />

    <div class="w-full max-w-[380px] flex flex-col items-center gap-5 relative z-20">
      <!-- 1. ЛОГОТИП И ЗАГОЛОВОК -->
      <div
        class="text-center flex flex-col items-center animate-enter-up"
        style="animation-delay: 0ms"
      >
        <!-- Контейнер логотипа -->
        <div
          @click="randomizeAurora"
          class="animate-float group cursor-pointer mb-4 mt-0 relative flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-[#121214] border border-[#27272a] shadow-2xl transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <!-- Внутренний блик при наведении -->
          <div
            class="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          ></div>

          <Zap class="w-8 h-8 text-[#fbbf24] drop-shadow-[0_0_10px_rgba(251,191,36,0.2)]" />
        </div>

        <h1 class="text-4xl font-bold tracking-tighter text-white drop-shadow-sm">Fleeets</h1>
        <p class="text-[#71717a] text-[16px] mt-1 font-medium tracking-wide">
          Ловите мысли молниеносно.
        </p>
      </div>

      <!-- 2. БЛОК TELEGRAM (КАРТОЧКА) -->
      <div
        class="w-full animate-enter-up"
        style="animation-delay: 100ms"
      >
        <div
          class="bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex justify-center hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 shadow-lg cursor-pointer group"
        >
          <!-- Сам виджет -->
          <div class="scale-110 origin-center">
            <TelegramLogin
              botName="fleeets_auth_bot"
              @login="onTelegramAuth"
            />
          </div>
        </div>
      </div>

      <!-- 3. РАЗДЕЛИТЕЛЬ -->
      <div
        class="flex items-center gap-4 w-full px-4 animate-enter-up"
        style="animation-delay: 200ms"
      >
        <div
          class="h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent flex-1"
        ></div>
        <span class="text-[11px] uppercase tracking-widest text-[#52525b] select-none font-medium"
          >или</span
        >
        <div
          class="h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent flex-1"
        ></div>
      </div>

      <!-- 4. EMAIL INPUT (КАСТОМНЫЙ ДИЗАЙН) -->
      <div
        class="w-full relative group animate-enter-up"
        style="animation-delay: 300ms"
      >
        <Mail
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616166] transition-colors duration-200 group-focus-within:text-white z-20"
        />
        <input
          v-model="email"
          placeholder="name@example.com"
          @keydown.enter="onEmailSubmit"
          class="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl py-4 pl-11 pr-4 text-white placeholder-[#52525b] outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all duration-200 shadow-lg"
        />
        <button
          @click="onEmailSubmit"
          :disabled="emailLoading || !email"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 active:scale-90 z-20"
          :class="
            email
              ? 'bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
              : 'text-[#52525b] bg-white/5 cursor-not-allowed'
          "
        >
          <ArrowRight
            v-if="!emailLoading"
            class="w-5 h-5 stroke-[2]"
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

<style scoped>
/* Тонкая настройка теней для максимального сходства */
input::placeholder {
  color: #3f3f46;
  font-weight: 500;
}
</style>
