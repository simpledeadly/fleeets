// utils/tts.ts

export async function speakText(text: string) {
  try {
    // Обращаемся к СВОЕМУ api
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) throw new Error('Ошибка генерации озвучки')

    // Дальше все так же: получаем блоб и играем
    const blob = await response.blob()
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)

    await audio.play()

    // Опционально: очистить память после окончания (чтобы браузер не пух)
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
    }
  } catch (error) {
    console.error('TTS Error:', error)
  }
}
