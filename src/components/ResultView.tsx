import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { getTemplate } from '../lib/templates'
import { formatDate, formatDuration } from '../lib/db'

export function ResultView() {
  const { selectedRecordingId, currentRecording, loadRecording, openRecording, setView } = useStore()
  const [copied, setCopied] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    if (selectedRecordingId) loadRecording(selectedRecordingId)
  }, [selectedRecordingId])

  if (!currentRecording || !currentRecording.result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const result = currentRecording.result
  const content = result.content
  const template = getTemplate(result.templateId)

  const handleCopy = async () => {
    const text = generatePlainText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentRecording.title,
          text: generatePlainText()
        })
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }

  const generatePlainText = (): string => {
    const lines: string[] = []
    lines.push(`# ${currentRecording.title}`)
    lines.push(`Date: ${formatDate(currentRecording.date)}`)
    lines.push(`Duration: ${formatDuration(currentRecording.duration)}`)
    lines.push(`Template: ${result.templateName}`)
    lines.push('')

    if (template) {
      for (const field of template.resultFields) {
        const value = content[field.key]
        if (!value) continue

        lines.push(`## ${field.label}`)

        if (field.type === 'text') {
          lines.push(value)
        } else if (field.type === 'list') {
          if (Array.isArray(value)) {
            value.forEach((item: any) => lines.push(`- ${typeof item === 'string' ? item : JSON.stringify(item)}`))
          }
        } else if (field.type === 'table') {
          if (Array.isArray(value)) {
            lines.push('| # | Action | Owner | Deadline | Status |')
            lines.push('|---|--------|-------|----------|--------|')
            value.forEach((item: any, i: number) => {
              const action = typeof item === 'string' ? item : item.action || ''
              const owner = item.owner || 'TBD'
              const deadline = item.deadline || 'TBD'
              const status = item.status || 'pending'
              lines.push(`| ${i + 1} | ${action} | ${owner} | ${deadline} | ${status} |`)
            })
          }
        } else if (field.type === 'discussions') {
          if (Array.isArray(value)) {
            value.forEach((d: any) => {
              lines.push(`### ${d.topic || 'Discussion'}`)
              if (d.discussion) lines.push(d.discussion)
              if (d.outcome) lines.push(`**Outcome:** ${d.outcome}`)
              lines.push('')
            })
          }
        }

        lines.push('')
      }
    }

    return lines.join('\n')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => setView('home')} className="text-muted hover:text-text transition-colors">
            <BackIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-heading font-semibold truncate">{currentRecording.title}</h2>
            <p className="text-xs text-muted">{result.templateName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-surface text-xs text-muted hover:text-text transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-lg bg-accent text-xs text-white"
            >
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Result Content */}
      <div className="flex-1 px-5 py-6 max-w-3xl mx-auto w-full">
        {/* Document Header */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-3 block">{template?.icon}</span>
          <h1 className="text-xl font-heading font-bold mb-2">{currentRecording.title}</h1>
          <p className="text-sm text-muted">
            {formatDate(currentRecording.date)} · {formatDuration(currentRecording.duration)}
          </p>
        </div>

        {/* Dynamic Sections */}
        <div className="space-y-6">
          {template?.resultFields.map(field => {
            const value = content[field.key]
            if (!value || (Array.isArray(value) && value.length === 0)) return null

            return (
              <section key={field.key} className="rounded-xl bg-surface p-5">
                <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">
                  {field.label}
                </h3>

                {field.type === 'text' && (
                  <p className="text-sm leading-relaxed text-text/90">{value}</p>
                )}

                {field.type === 'list' && Array.isArray(value) && (
                  <ul className="space-y-2">
                    {value.map((item: any, i: number) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-accent mt-0.5">•</span>
                        <span className="text-text/90">{typeof item === 'string' ? item : item.action || JSON.stringify(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {field.type === 'table' && Array.isArray(value) && (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-muted font-medium text-xs">#</th>
                          <th className="text-left py-2 px-2 text-muted font-medium text-xs">Action</th>
                          <th className="text-left py-2 px-2 text-muted font-medium text-xs">Owner</th>
                          <th className="text-left py-2 px-2 text-muted font-medium text-xs">Deadline</th>
                          <th className="text-left py-2 px-2 text-muted font-medium text-xs">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {value.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 px-2 text-muted">{i + 1}</td>
                            <td className="py-2 px-2">{typeof item === 'string' ? item : item.action || ''}</td>
                            <td className="py-2 px-2 text-muted">{item.owner || 'TBD'}</td>
                            <td className="py-2 px-2 text-muted">{item.deadline || 'TBD'}</td>
                            <td className="py-2 px-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                item.status === 'completed' ? 'bg-green/15 text-green' : 'bg-yellow/15 text-yellow'
                              }`}>
                                {item.status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {field.type === 'discussions' && Array.isArray(value) && (
                  <div className="space-y-4">
                    {value.map((d: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-bg">
                        <p className="text-sm font-medium mb-1">{d.topic || `Discussion ${i + 1}`}</p>
                        {d.discussion && <p className="text-sm text-text/80 mb-2">{d.discussion}</p>}
                        {d.outcome && (
                          <p className="text-xs text-accent">
                            <span className="font-medium">Outcome:</span> {d.outcome}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {/* Fallback: show raw content if no template fields matched */}
          {(!template || template.resultFields.every(f => !content[f.key])) && (
            <section className="rounded-xl bg-surface p-5">
              <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">Result</h3>
              <pre className="text-sm text-text/80 whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
            </section>
          )}
        </div>

        {/* Transcript Collapsible */}
        {currentRecording.transcript && (
          <div className="mt-8">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors mb-3"
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: showTranscript ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Full Transcript
            </button>
            {showTranscript && (
              <div className="rounded-xl bg-surface p-5">
                <p className="text-sm text-text/70 leading-relaxed whitespace-pre-wrap">
                  {currentRecording.transcript.fullText ||
                    currentRecording.transcript.segments?.map((s: any) => s.text).join(' ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted">
            Generated {formatDate(result.generatedAt)} · DiScribe
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur-sm border-t border-border px-5 py-4">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <button
            onClick={() => openRecording(currentRecording.id)}
            className="flex-1 py-3 rounded-xl bg-surface text-sm font-medium text-muted hover:text-text transition-colors"
          >
            Back to Recording
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-3 rounded-xl bg-accent text-sm font-medium text-white"
          >
            {copied ? '✓ Copied!' : 'Copy All'}
          </button>
        </div>
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
