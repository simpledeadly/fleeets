// utils/tts.ts

export async function speakText(text: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error('Ошибка генерации озвучки')

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)

      audio.onplay = () => {
        resolve()
      }

      audio.onerror = (e) => {
        reject(e)
      }

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (error) {
      console.error('TTS Error:', error)
      reject(error)
    }
  })
}
