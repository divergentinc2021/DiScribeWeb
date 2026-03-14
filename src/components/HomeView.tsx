import { useRef } from 'react'
import { useStore } from '../lib/store'
import { templates, getTemplate } from '../lib/templates'
import { formatDate, formatDuration, generateId, saveRecording } from '../lib/db'

export function HomeView() {
  const { recordings, setView, openRecording, openResult, selectedTemplateId, setSelectedTemplateId, loadRecordings } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Get duration using AudioContext
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration
      await audioCtx.close()

      // Create recording from uploaded file
      const title = file.name.replace(/\.[^.]+$/, '') // strip extension
      const id = generateId()
      await saveRecording({
        id,
        title,
        templateId: selectedTemplateId,
        date: new Date().toISOString(),
        duration,
        audioBlob: file,
        status: 'recorded',
      })

      await loadRecordings()
      openRecording(id)
    } catch (err: any) {
      alert(`Could not load audio file: ${err.message}`)
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-heading font-bold tracking-tight">DiScribe</h1>
          <p className="text-xs text-muted mt-0.5">Voice → AI → Structured Notes</p>
        </div>
        <button
          onClick={() => setView('settings')}
          className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted hover:text-text transition-colors"
        >
          <SettingsIcon />
        </button>
      </header>

      {/* Template Selector */}
      <section className="px-5 pt-5 pb-3">
        <p className="text-xs text-muted uppercase tracking-wider mb-3 font-medium">Template</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedTemplateId === t.id
                  ? 'text-white shadow-lg'
                  : 'bg-surface text-muted hover:text-text'
              }`}
              style={selectedTemplateId === t.id ? { background: t.color } : undefined}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">
          {getTemplate(selectedTemplateId)?.description}
        </p>
      </section>

      {/* Record / Upload Buttons */}
      <section className="px-5 py-6 flex items-center justify-center gap-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-text transition-colors active:scale-95"
          title="Upload audio file"
        >
          <UploadIcon />
        </button>
        <button
          onClick={() => setView('recorder')}
          className="relative w-20 h-20 rounded-full bg-red flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <MicIcon />
        </button>
        <div className="w-14" /> {/* spacer for visual balance */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm,.aac,.flac"
          onChange={handleFileUpload}
          className="hidden"
        />
      </section>

      {/* Recordings List */}
      <section className="flex-1 px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Recordings ({recordings.length})
          </p>
        </div>

        {recordings.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="text-4xl mb-3">🎙️</p>
            <p className="text-sm">No recordings yet</p>
            <p className="text-xs mt-1">Tap the mic button to start recording</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recordings.map(rec => {
              const tmpl = getTemplate(rec.templateId)
              return (
                <button
                  key={rec.id}
                  onClick={() => rec.result ? openResult(rec.id) : openRecording(rec.id)}
                  className="w-full text-left p-4 rounded-xl bg-surface hover:bg-surface2 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{tmpl?.icon || '🎙️'}</span>
                        <h3 className="text-sm font-medium truncate">{rec.title}</h3>
                      </div>
                      <p className="text-xs text-muted">
                        {formatDate(rec.date)} · {formatDuration(rec.duration)}
                      </p>
                    </div>
                    <StatusBadge status={rec.status} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    recorded: 'bg-yellow/15 text-yellow',
    transcribing: 'bg-accent/15 text-accent',
    transcribed: 'bg-green/15 text-green',
    processing: 'bg-accent/15 text-accent',
    done: 'bg-green/15 text-green',
    error: 'bg-red/15 text-red',
  }
  const labels: Record<string, string> = {
    recorded: 'New',
    transcribing: 'Transcribing…',
    transcribed: 'Transcribed',
    processing: 'Processing…',
    done: 'Done',
    error: 'Error',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
