// utils/tts.ts

export function speakText(text: string) {
  // Проверяем поддержку браузером
  if (!('speechSynthesis' in window)) {
    console.warn('TTS не поддерживается в этом браузере')
    return
  }

  // Останавливаем, если что-то уже говорится (чтобы не накладывалось)
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)

  // Настройки "человечности"
  utterance.rate = 1.0 // Скорость (1.0 - норма)
  utterance.pitch = 1.0 // Тон
  utterance.volume = 1.0 // Громкость

  // Ищем русский голос
  const voices = window.speechSynthesis.getVoices()
  // Пытаемся найти Google Русский (на Chrome) или любой другой RU
  const ruVoice = voices.find((v) => v.lang.includes('ru-RU') || v.lang.includes('ru'))

  if (ruVoice) {
    utterance.voice = ruVoice
  }

  window.speechSynthesis.speak(utterance)
}

// ВАЖНО: Список голосов загружается асинхронно.
// В Chrome иногда нужно повесить слушатель, чтобы голоса подгрузились:
window.speechSynthesis.onvoiceschanged = () => {
  // Просто триггер, чтобы браузер "проснулся" и увидел голоса
  window.speechSynthesis.getVoices()
}
