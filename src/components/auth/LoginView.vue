<script setup lang="ts">
import { ref } from 'vue'
import { Zap, ArrowRight, Mail, KeyRound } from 'lucide-vue-next'
import TelegramLogin from '../TelegramLogin.vue'
import AuroraBackground from './AuroraBackground.vue'
import { useAuth } from '../../composables/useAuth'
import { usePostHog } from '../../composables/usePostHog'

const emit = defineEmits(['login-telegram'])
const { emailLoading, sendEmailOtp, verifyEmailOtp, handleGoogleLogin } = useAuth()

const email = ref('')
const otpCode = ref('')
const step = ref<'email' | 'otp'>('email') // Состояние экрана

const posthog = usePostHog()

// Настройки "Авроры" подстраиваем под скриншот (более темные, глубокие тона)
const auroraHue = ref(240) // Сине-фиолетовый
const auroraSat = ref(60)

const randomizeAurora = () => {
  auroraHue.value = Math.floor(Math.random() * 360)
  auroraSat.value = 60 + Math.floor(Math.random() * 40)

  posthog.capture('aurora_changed', {
    hue: auroraHue.value,
    sat: auroraSat.value,
  })
}

const onTelegramAuth = (tgUser: any) => {
  emit('login-telegram', tgUser)
}

// Шаг 1: Отправка кода
const onEmailSubmit = async () => {
  if (!email.value) return
  try {
    await sendEmailOtp(email.value)
    step.value = 'otp' // Переходим к вводу кода
  } catch (e: any) {
    alert('Ошибка отправки: ' + e.message)
  }
}

// Шаг 2: Проверка кода
const onOtpSubmit = async () => {
  if (!otpCode.value) return
  try {
    await verifyEmailOtp(email.value, otpCode.value)
    // В случае успеха useAuth сам обновит user.value, и App.vue скроет этот экран
  } catch (e: any) {
    alert('Неверный код: ' + e.message)
  }
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

      <!-- СОЦСЕТИ (TELEGRAM + GOOGLE) -->
      <div
        class="w-full flex flex-col gap-3 animate-enter-up"
        style="animation-delay: 100ms"
      >
        <!-- Telegram -->
        <div
          class="bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex justify-center shadow-lg transition-transform hover:scale-[1.02]"
        >
          <TelegramLogin @login="onTelegramAuth" />
        </div>
 
        <!-- Google -->
        <button
          @click="handleGoogleLogin"
          class="w-full bg-white text-black font-semibold rounded-2xl p-3 flex items-center justify-center gap-3 shadow-lg hover:bg-gray-100 transition-all active:scale-95"
        >
          <!-- SVG иконка Google -->
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Войти через Google</span>
        </button>
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

      <div
        class="w-full relative group animate-enter-up"
        style="animation-delay: 300ms"
      >
        <!-- ШАГ 1: ПОЧТА -->
        <div
          v-if="step === 'email'"
          class="relative"
        >
          <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616166]" />
          <input
            v-model="email"
            placeholder="name@example.com"
            @keydown.enter="onEmailSubmit"
            class="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl py-4 pl-11 pr-12 text-white outline-none focus:bg-white/[0.07] transition-all"
          />
          <button
            @click="onEmailSubmit"
            :disabled="emailLoading || !email"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white text-black disabled:opacity-50"
          >
            <div
              v-if="emailLoading"
              class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"
            ></div>
            <ArrowRight
              v-else
              class="w-5 h-5"
            />
          </button>
        </div>

        <!-- ШАГ 2: КОД -->
        <div
          v-else
          class="relative"
        >
          <KeyRound class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616166]" />
          <input
            v-model="otpCode"
            placeholder="Код из письма (123456)"
            @keydown.enter="onOtpSubmit"
            class="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl py-4 pl-11 pr-12 text-white outline-none focus:bg-white/[0.07] transition-all"
            autofocus
          />
          <button
            @click="onOtpSubmit"
            :disabled="emailLoading || !otpCode"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white text-black disabled:opacity-50"
          >
            <div
              v-if="emailLoading"
              class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"
            ></div>
            <ArrowRight
              v-else
              class="w-5 h-5"
            />
          </button>

          <!-- Кнопка назад -->
          <button
            @click="step = 'email'"
            class="absolute -bottom-8 left-1 text-xs text-gray-500 hover:text-white"
          >
            ← Изменить почту
          </button>
        </div>
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
