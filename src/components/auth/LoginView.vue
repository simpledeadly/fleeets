<script setup lang="ts">
import { ref } from 'vue'
import { Zap, ArrowRight, Mail } from 'lucide-vue-next'
import TelegramLogin from '../TelegramLogin.vue'
import AuroraBackground from './AuroraBackground.vue'
import { useAuth } from '../../composables/useAuth'
import { usePostHog } from '../../composables/usePostHog'

const emit = defineEmits(['login-telegram'])
const { emailLoading, sendEmailOtp, verifyEmailOtp, handleGoogleLogin } = useAuth()

const email = ref('')
const otpCode = ref('')

// Режимы нижнего блока: 'socials' (кнопки) | 'email' (ввод почты) | 'otp' (ввод кода)
const authMode = ref<'socials' | 'email' | 'otp'>('socials')

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

const onTelegramAuth = (tgUser: any) => emit('login-telegram', tgUser)

// Логика Email
const startEmailAuth = () => {
  authMode.value = 'email'
}
const cancelEmailAuth = () => {
  authMode.value = 'socials'
  email.value = ''
  otpCode.value = ''
}

const onEmailSubmit = async () => {
  if (!email.value) return
  try {
    await sendEmailOtp(email.value)
    authMode.value = 'otp'
  } catch (e: any) {
    alert(e.message)
  }
}

const onOtpSubmit = async () => {
  if (!otpCode.value) return
  try {
    await verifyEmailOtp(email.value, otpCode.value)
  } catch (e: any) {
    alert(e.message)
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

    <div class="w-full max-w-[380px] flex flex-col items-center relative z-20">
      <!-- 1. ЛОГОТИП И ЗАГОЛОВОК -->
      <div
        class="text-center mb-8 flex flex-col items-center animate-enter-up"
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
        <p class="text-white/45 text-[16px] mt-1 font-medium tracking-wide">
          Ловите мысли молниеносно.
        </p>
      </div>

      <!-- Telegram -->
      <div
        class="w-full mb-8 animate-enter-up"
        style="animation-delay: 100ms"
      >
        <TelegramLogin @login="onTelegramAuth" />
      </div>

      <!-- 3. РАЗДЕЛИТЕЛЬ -->
      <div
        class="flex items-center gap-4 w-full mb-4 opacity-40 animate-enter-up"
        style="animation-delay: 150ms"
      >
        <div class="h-px bg-white/10 flex-1"></div>
        <span class="text-[12px] uppercase tracking-widest text-white/50 font-bold">или</span>
        <div class="h-px bg-white/10 flex-1"></div>
      </div>

      <!-- 3. ALTERNATIVES AREA (SWITCHABLE) -->
      <div
        class="w-full h-[60px] relative animate-enter-up"
        style="animation-delay: 200ms"
      >
        <Transition
          name="fade-slide"
          mode="out-in"
        >
          <!-- ВАРИАНТ А: КРУГЛЫЕ КНОПКИ -->
          <div
            v-if="authMode === 'socials'"
            class="flex justify-center gap-4 w-full absolute inset-0"
          >
            <!-- Google Button -->
            <button
              @click="handleGoogleLogin"
              class="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-150 group"
              title="Войти через Google"
            >
              <svg
                class="w-6 h-6 group-hover:rotate-12 transition-transform duration-150"
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
            </button>

            <!-- Email Button -->
            <button
              @click="startEmailAuth"
              class="w-12 h-12 rounded-full bg-[#1c1c1e] border border-white/10 text-white flex items-center justify-center hover:scale-110 hover:border-white/30 hover:bg-[#27272a] transition-all duration-150 group"
              title="Войти по почте"
            >
              <Mail class="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          <!-- ВАРИАНТ Б: ВВОД ПОЧТЫ -->
          <div
            v-else-if="authMode === 'email'"
            class="w-full absolute inset-0"
          >
            <div class="relative group">
              <input
                v-model="email"
                placeholder="name@example.com"
                @keydown.enter="onEmailSubmit"
                class="w-full h-14 bg-[#1c1c1e] border border-white/10 rounded-2xl pl-4 pr-12 text-white placeholder-gray-500 outline-none focus:border-white/20 focus:bg-[#27272a] transition-all font-medium text-sm"
                autoFocus
              />
              <!-- Кнопка Отмены (Крестик) -->
              <button
                v-if="!email"
                @click="cancelEmailAuth"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X class="w-4 h-4" />
              </button>
              <!-- Кнопка Далее (Стрелка) -->
              <button
                v-else
                @click="onEmailSubmit"
                :disabled="emailLoading"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 active:scale-95 transition-all"
              >
                <div
                  v-if="emailLoading"
                  class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"
                ></div>
                <ArrowRight
                  v-else
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>

          <!-- ВАРИАНТ В: ВВОД КОДА -->
          <div
            v-else-if="authMode === 'otp'"
            class="w-full absolute inset-0"
          >
            <div class="relative group">
              <input
                v-model="otpCode"
                placeholder="Код из письма"
                @keydown.enter="onOtpSubmit"
                class="w-full h-14 bg-[#1c1c1e] border border-white/10 rounded-2xl pl-4 pr-12 text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:bg-[#27272a] transition-all font-medium text-sm tracking-widest"
                autoFocus
              />
              <button
                @click="onOtpSubmit"
                :disabled="emailLoading || !otpCode"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 active:scale-95 transition-all"
              >
                <div
                  v-if="emailLoading"
                  class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"
                ></div>
                <ArrowRight
                  v-else
                  class="w-4 h-4"
                />
              </button>

              <button
                @click="authMode = 'email'"
                class="absolute -bottom-6 left-1 text-[10px] text-gray-500 hover:text-white transition-colors"
              >
                ← Назад
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Анимация переключения режимов */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
