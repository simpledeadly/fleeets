'use client'

import { useState, useRef, useEffect } from 'react'

type RecorderStatus = 'idle' | 'permission_denied' | 'recording' | 'stopped'

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media Devices API not supported in this browser.')
      }

      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setStatus('recording')
      setAudioBlob(null)
      audioChunksRef.current = []

      mediaRecorderRef.current = new MediaRecorder(stream)

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setStatus('stopped')
        // Важно: отключаем микрофон, чтобы погас индикатор
        streamRef.current?.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
    } catch (err) {
      console.error('Error starting recording:', err)
      setStatus('permission_denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return { status, audioBlob, startRecording, stopRecording }
}
