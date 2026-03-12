import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../lib/store'
import { getTemplate } from '../lib/templates'
import { generateId, formatDuration } from '../lib/db'
import type { Recording } from '../lib/db'

export function RecorderView() {
  const {
    setView, addRecording, openRecording,
    isRecording, setIsRecording,
    recordingDuration, setRecordingDuration,
    selectedTemplateId, settings
  } = useStore()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [title, setTitle] = useState('')
  const template = getTemplate(selectedTemplateId)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      stopStream()
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

        const recording: Recording = {
          id: generateId(),
          title: title.trim() || `${template?.name || 'Recording'} — ${new Date().toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          templateId: selectedTemplateId,
          date: new Date().toISOString(),
          duration,
          audioBlob: blob,
          status: 'recorded'
        }

        await addRecording(recording)
        openRecording(recording.id)
      }

      recorder.start(1000) // collect data every second
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setRecordingDuration(0)
      setPermissionDenied(false)

      // Timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setRecordingDuration(elapsed)
      }, 200)

    } catch (err: any) {
      console.error('Mic access denied:', err)
      setPermissionDenied(true)
    }
  }

  const stopRecording = useCallback(() => {
    stopTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopStream()
    setIsRecording(false)
  }, [])

  const handleBack = () => {
    if (isRecording) stopRecording()
    setView('home')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={handleBack} className="text-muted hover:text-text transition-colors">
          <BackIcon />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-heading font-semibold">
            {template?.icon} {template?.name || 'Recording'}
          </h2>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        {/* Title Input */}
        {!isRecording && (
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`${template?.name || 'Recording'} title (optional)`}
            className="w-full max-w-sm mb-8 px-4 py-3 rounded-xl bg-surface border border-border text-text text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
          />
        )}

        {/* Timer */}
        <div className="text-5xl font-heading font-bold tracking-tight mb-2 tabular-nums">
          {formatDuration(recordingDuration)}
        </div>
        <p className="text-sm text-muted mb-10">
          {isRecording ? 'Recording…' : 'Ready to record'}
        </p>

        {/* Record / Stop Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
            isRecording ? 'bg-red' : 'bg-accent hover:bg-accent-hover'
          }`}
        >
          {isRecording && <div className="pulse-ring absolute inset-0 rounded-full" />}
          {isRecording ? <StopIcon /> : <MicIcon />}
        </button>

        {/* Permission Error */}
        {permissionDenied && (
          <div className="mt-8 px-5 py-3 rounded-xl bg-red/10 border border-red/20 max-w-sm">
            <p className="text-sm text-red font-medium mb-1">Microphone access denied</p>
            <p className="text-xs text-muted">
              Please allow microphone access in your browser settings and try again.
            </p>
          </div>
        )}

        {/* Worker URL Warning */}
        {!settings.workerUrl && !isRecording && (
          <div className="mt-8 px-5 py-3 rounded-xl bg-yellow/10 border border-yellow/20 max-w-sm">
            <p className="text-sm text-yellow font-medium mb-1">Worker URL not set</p>
            <p className="text-xs text-muted">
              You can still record, but transcription requires a Worker URL.{' '}
              <button onClick={() => setView('settings')} className="text-accent underline">
                Configure in Settings
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
