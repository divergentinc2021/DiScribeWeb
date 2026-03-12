import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { getTemplate } from '../lib/templates'
import { formatDate, formatDuration } from '../lib/db'

export function RecordingView() {
  const {
    selectedRecordingId, currentRecording, loadRecording,
    updateRecording, deleteRecording, setView, openResult,
    settings, processing, setProcessing
  } = useStore()

  const [showDelete, setShowDelete] = useState(false)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedRecordingId) loadRecording(selectedRecordingId)
  }, [selectedRecordingId])

  // Create audio URL from blob
  useEffect(() => {
    if (currentRecording?.audioBlob) {
      const url = URL.createObjectURL(currentRecording.audioBlob)
      audioUrlRef.current = url
      return () => URL.revokeObjectURL(url)
    }
  }, [currentRecording?.id])

  if (!currentRecording) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const template = getTemplate(currentRecording.templateId)
  const isProcessing = currentRecording.status === 'transcribing' || currentRecording.status === 'processing'

  const handleTranscribe = async () => {
    if (!settings.workerUrl) {
      alert('Please set your Worker URL in Settings first.')
      return
    }

    try {
      setProcessing({ status: 'Uploading audio…' })
      await updateRecording(currentRecording.id, { status: 'transcribing' })

      // Read blob as ArrayBuffer
      const buffer = await currentRecording.audioBlob.arrayBuffer()

      // Send to Worker for transcription
      setProcessing({ status: 'Transcribing…', progress: 30 })
      const transcribeRes = await fetch(`${settings.workerUrl}/api/transcribe`, {
        method: 'POST',
        body: buffer,
      })

      if (!transcribeRes.ok) {
        throw new Error(`Transcription failed: ${transcribeRes.status}`)
      }

      const transcript = await transcribeRes.json()
      setProcessing({ status: 'Transcription complete', progress: 60 })

      await updateRecording(currentRecording.id, {
        status: 'transcribed',
        transcript,
      })

      // Auto-process with template
      await handleProcess(transcript)

    } catch (err: any) {
      console.error('Transcription error:', err)
      await updateRecording(currentRecording.id, {
        status: 'error',
        error: err.message || 'Transcription failed'
      })
      setProcessing(null)
    }
  }

  const handleProcess = async (transcript?: any) => {
    const t = transcript || currentRecording.transcript
    if (!t) return
    if (!template) return

    try {
      setProcessing({ status: 'Processing with AI…', progress: 70 })
      await updateRecording(currentRecording.id, { status: 'processing' })

      const text = t.segments
        ? t.segments.map((s: any) => `[${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, '0')}] ${s.text}`).join('\n')
        : t.fullText || ''

      let body: any
      let endpoint = template.endpoint

      if (template.endpoint === '/api/generate-minutes') {
        body = JSON.stringify({
          transcript: text,
          meetingTitle: currentRecording.title,
          duration: currentRecording.duration,
          date: currentRecording.date
        })
      } else {
        // For /api/summarize — use custom prompt if template has one
        const promptText = template.prompt
          ? template.prompt.replace('{transcript}', text)
          : text

        body = JSON.stringify({
          transcript: promptText,
          meetingTitle: currentRecording.title
        })
      }

      setProcessing({ status: 'Generating result…', progress: 85 })
      const res = await fetch(`${settings.workerUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!res.ok) throw new Error(`Processing failed: ${res.status}`)

      const result = await res.json()

      await updateRecording(currentRecording.id, {
        status: 'done',
        result: {
          templateId: template.id,
          templateName: template.name,
          content: result,
          generatedAt: new Date().toISOString()
        }
      })

      setProcessing(null)
      openResult(currentRecording.id)

    } catch (err: any) {
      console.error('Processing error:', err)
      await updateRecording(currentRecording.id, {
        status: 'error',
        error: err.message || 'Processing failed'
      })
      setProcessing(null)
    }
  }

  const handleDelete = async () => {
    await deleteRecording(currentRecording.id)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => setView('home')} className="text-muted hover:text-text transition-colors">
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-heading font-semibold truncate">{currentRecording.title}</h2>
          <p className="text-xs text-muted">{formatDate(currentRecording.date)}</p>
        </div>
        <button
          onClick={() => setShowDelete(!showDelete)}
          className="text-muted hover:text-red transition-colors"
        >
          <TrashIcon />
        </button>
      </header>

      {/* Delete Confirm */}
      {showDelete && (
        <div className="mx-5 mt-3 p-3 rounded-xl bg-red/10 border border-red/20 flex items-center justify-between">
          <p className="text-sm text-red">Delete this recording?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} className="text-xs px-3 py-1 rounded-lg bg-surface text-muted">
              Cancel
            </button>
            <button onClick={handleDelete} className="text-xs px-3 py-1 rounded-lg bg-red text-white">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Info Card */}
        <div className="p-4 rounded-xl bg-surface space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template?.icon || '🎙️'}</span>
            <div>
              <p className="text-sm font-medium">{template?.name || 'Recording'}</p>
              <p className="text-xs text-muted">{formatDuration(currentRecording.duration)} recorded</p>
            </div>
          </div>

          {/* Audio Player */}
          {audioUrlRef.current && (
            <audio
              controls
              src={audioUrlRef.current}
              className="w-full h-10 rounded-lg"
              style={{ filter: 'invert(1) hue-rotate(180deg)' }}
            />
          )}
        </div>

        {/* Error */}
        {currentRecording.error && (
          <div className="p-4 rounded-xl bg-red/10 border border-red/20">
            <p className="text-sm text-red font-medium mb-1">Error</p>
            <p className="text-xs text-muted">{currentRecording.error}</p>
          </div>
        )}

        {/* Processing Status */}
        {processing && (
          <div className="p-4 rounded-xl bg-surface border border-accent/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-sm font-medium">{processing.status}</p>
            </div>
            {processing.progress != null && (
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${processing.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Transcript Preview */}
        {currentRecording.transcript && (
          <div className="p-4 rounded-xl bg-surface">
            <p className="text-xs text-muted uppercase tracking-wider mb-2 font-medium">Transcript</p>
            <p className="text-sm text-text/80 leading-relaxed line-clamp-6">
              {currentRecording.transcript.fullText || currentRecording.transcript.segments?.map((s: any) => s.text).join(' ')}
            </p>
          </div>
        )}

        {/* Result Preview */}
        {currentRecording.result && (
          <button
            onClick={() => openResult(currentRecording.id)}
            className="w-full p-4 rounded-xl bg-accent/10 border border-accent/20 text-left hover:bg-accent/15 transition-colors"
          >
            <p className="text-sm font-medium text-accent mb-1">View {currentRecording.result.templateName}</p>
            <p className="text-xs text-muted">
              Generated {formatDate(currentRecording.result.generatedAt)}
            </p>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-8 space-y-3">
        {(currentRecording.status === 'recorded' || currentRecording.status === 'error') && (
          <button
            onClick={handleTranscribe}
            disabled={isProcessing || !settings.workerUrl}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            {!settings.workerUrl ? 'Set Worker URL in Settings' : 'Transcribe & Process'}
          </button>
        )}
        {currentRecording.status === 'transcribed' && !currentRecording.result && (
          <button
            onClick={() => handleProcess()}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            Process with {template?.name || 'Template'}
          </button>
        )}
        {currentRecording.result && (
          <button
            onClick={() => openResult(currentRecording.id)}
            className="w-full py-3.5 rounded-xl bg-green text-white font-medium text-sm"
          >
            View {currentRecording.result.templateName}
          </button>
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

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
