<script setup lang="ts">
import { ref } from 'vue'
import { Zap, ArrowRight, Mail, X, ChevronLeft } from 'lucide-vue-next'
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
        class="text-center mb-6 flex flex-col items-center animate-enter-up"
        style="animation-delay: 0ms"
      >
        <!-- Контейнер логотипа -->
        <div
          @click="randomizeAurora"
          class="animate-float group cursor-pointer mb-4 mt-0 relative flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-[#121214] border border-[#27272a] shadow-2xl transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <!-- Внутренний блик при наведении -->
          <div
            class="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          ></div>

          <Zap class="w-8 h-8 text-[#fbbf24] drop-shadow-[0_0_10px_rgba(251,191,36,0.2)]" />
        </div>

        <h1 class="text-4xl font-bold tracking-tighter text-white drop-shadow-sm">Fleeets</h1>
        <p class="text-white/45 text-[16px] mt-1 font-medium tracking-wide">
          Ловите мысли молниеносно.
        </p>
      </div>

      <!-- ГЛАВНАЯ СТЕКЛЯННАЯ КАРТОЧКА -->
      <div
        class="w-full bg-[#0a0a0a]/40 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-enter-up"
        style="animation-delay: 100ms"
      >
        <!-- 1. TELEGRAM (Primary) -->
        <div class="mb-2">
          <TelegramLogin @login="onTelegramAuth" />
        </div>

        <!-- DIVIDER -->
        <div class="relative flex py-2 items-center mb-2">
          <div class="flex-grow border-t border-white/10"></div>
          <span
            class="flex-shrink-0 mx-4 text-[12px] text-white/40 uppercase tracking-widest font-semibold"
            >или</span
          >
          <div class="flex-grow border-t border-white/10"></div>
        </div>

        <!-- 2. НИЖНЯЯ СЕКЦИЯ (СМЕНА РЕЖИМОВ) -->
        <!-- Фиксированная высота предотвращает скачки интерфейса -->
        <div class="h-[52px] relative">
          <Transition
            name="fade-scale"
            mode="out-in"
          >
            <!-- ВАРИАНТ А: КНОПКИ (Google + Email) -->
            <div
              v-if="authMode === 'socials'"
              class="flex justify-center gap-4 w-full h-full"
            >
              <!-- Google -->
              <button
                @click="handleGoogleLogin"
                class="flex-1 h-full rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 group"
                title="Войти через Google"
              >
                <!-- SVG Google Monochrome -> Color on Hover -->
                <svg
                  class="w-5 h-5 text-white/70 group-hover:text-white transition-colors"
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
                <span class="text-sm font-medium text-white/80 group-hover:text-white">Google</span>
              </button>

              <!-- Email -->
              <button
                @click="startEmailAuth"
                class="flex-1 h-full rounded-2xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 group"
                title="Войти по почте"
              >
                <Mail class="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                <span class="text-sm font-medium text-white/80 group-hover:text-white">Почта</span>
              </button>
            </div>

            <!-- ВАРИАНТ Б: ВВОД ПОЧТЫ -->
            <div
              v-else-if="authMode === 'email'"
              class="w-full h-full relative"
            >
              <div class="relative group h-full">
                <div
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                >
                  <Mail class="w-5 h-5" />
                </div>
                <input
                  v-model="email"
                  placeholder="name@example.com"
                  @keydown.enter="onEmailSubmit"
                  class="w-full h-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-12 text-white placeholder-white/30 outline-none focus:border-white/30 focus:bg-black/30 transition-all font-medium text-sm"
                  autoFocus
                />

                <!-- Кнопка Отмены (Крестик) -->
                <button
                  v-if="!email"
                  @click="cancelEmailAuth"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X class="w-4 h-4" />
                </button>

                <!-- Кнопка Далее -->
                <button
                  v-else
                  @click="onEmailSubmit"
                  :disabled="emailLoading"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                >
                  <div
                    v-if="emailLoading"
                    class="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"
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
              class="w-full h-full relative"
            >
              <div class="relative group h-full">
                <button
                  @click="authMode = 'email'"
                  class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all z-10"
                  title="Назад"
                >
                  <ChevronLeft class="w-4 h-4" />
                </button>

                <input
                  v-model="otpCode"
                  placeholder="Код: 12345678"
                  @keydown.enter="onOtpSubmit"
                  class="w-full h-full bg-black/20 border border-blue-500/30 rounded-2xl pl-12 pr-12 text-center text-white placeholder-white/20 outline-none focus:border-blue-500/60 focus:bg-black/30 transition-all text-lg tracking-widest"
                  autoFocus
                />

                <button
                  @click="onOtpSubmit"
                  :disabled="emailLoading || !otpCode"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/5 cursor-pointer"
                >
                  <div
                    v-if="emailLoading"
                    class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  ></div>
                  <ArrowRight
                    v-else
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Footer Text -->
      <div
        class="mt-6 text-center animate-enter-up"
        style="animation-delay: 300ms"
      >
        <p class="text-[12px] text-white/20">
          Продолжая, вы принимаете
          <a
            href="#"
            class="hover:underline text-white/30"
            >условия сервиса</a
          >
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Анимации появления */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(5px);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-5px);
}

/* Общие стили */
input::placeholder {
  transition: color 0.1s;
}
input:focus::placeholder {
  color: transparent;
}
</style>
