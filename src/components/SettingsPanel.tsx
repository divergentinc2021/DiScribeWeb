import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { templates } from '../lib/templates'

export function SettingsPanel() {
  const { settings, saveSettings, setView } = useStore()

  const [workerUrl, setWorkerUrl] = useState(settings.workerUrl)
  const [defaultTemplate, setDefaultTemplate] = useState(settings.defaultTemplate)
  const [language, setLanguage] = useState(settings.language || 'auto')
  const [translateToEnglish, setTranslateToEnglish] = useState(settings.translateToEnglish || false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setWorkerUrl(settings.workerUrl)
    setDefaultTemplate(settings.defaultTemplate)
    setLanguage(settings.language || 'auto')
    setTranslateToEnglish(settings.translateToEnglish || false)
  }, [settings])

  const handleTest = async () => {
    if (!workerUrl.trim()) return
    setTesting(true)
    setTestResult(null)

    try {
      const url = workerUrl.trim().replace(/\/+$/, '')
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) {
        const data = await res.json()
        if (data.endpoints) {
          setTestResult({ ok: true, msg: `Connected! ${data.endpoints.length} endpoints available.` })
        } else {
          setTestResult({ ok: true, msg: 'Connected successfully.' })
        }
      } else {
        setTestResult({ ok: false, msg: `Server returned ${res.status}` })
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Connection failed' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    await saveSettings({
      workerUrl: workerUrl.trim().replace(/\/+$/, ''),
      defaultTemplate,
      language,
      translateToEnglish
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => setView('home')} className="text-muted hover:text-text transition-colors">
          <BackIcon />
        </button>
        <h2 className="text-sm font-heading font-semibold">Settings</h2>
      </header>

      <div className="flex-1 px-5 py-6 space-y-8 max-w-lg mx-auto w-full">
        {/* Worker URL */}
        <section>
          <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">
            Cloudflare Worker URL
          </h3>
          <p className="text-xs text-muted mb-3">
            Your AI worker handles transcription and processing. Deploy the DiScribe worker to Cloudflare Workers.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={workerUrl}
              onChange={e => setWorkerUrl(e.target.value)}
              placeholder="https://meeting-summarizer.your-subdomain.workers.dev"
              className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-text text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleTest}
              disabled={testing || !workerUrl.trim()}
              className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-muted hover:text-text disabled:opacity-40 transition-colors"
            >
              {testing ? '…' : 'Test'}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs mt-2 ${testResult.ok ? 'text-green' : 'text-red'}`}>
              {testResult.ok ? '✓' : '✗'} {testResult.msg}
            </p>
          )}
        </section>

        {/* Transcription Language */}
        <section>
          <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">
            Transcription Language
          </h3>
          <p className="text-xs text-muted mb-3">
            Select the language of your recordings. Auto-detect works for most cases.
          </p>
          <select
            value={language}
            onChange={e => {
              setLanguage(e.target.value)
              if (e.target.value === 'en' || e.target.value === 'auto') setTranslateToEnglish(false)
            }}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="fr">French / Fran&ccedil;ais</option>
            <option value="es">Spanish / Espa&ntilde;ol</option>
            <option value="de">German / Deutsch</option>
            <option value="pt">Portuguese / Portugu&ecirc;s</option>
            <option value="af">Afrikaans</option>
            <option value="zu">Zulu / isiZulu</option>
            <option value="xh">Xhosa / isiXhosa</option>
          </select>

          {language !== 'en' && language !== 'auto' && (
            <label className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-surface border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={translateToEnglish}
                onChange={e => setTranslateToEnglish(e.target.checked)}
                className="w-4 h-4 rounded accent-accent"
              />
              <div>
                <p className="text-sm font-medium">Translate to English</p>
                <p className="text-xs text-muted">Whisper will translate the transcript to English</p>
              </div>
            </label>
          )}
        </section>

        {/* Default Template */}
        <section>
          <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">
            Default Template
          </h3>
          <p className="text-xs text-muted mb-3">
            Pre-select this template when creating new recordings.
          </p>
          <div className="space-y-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setDefaultTemplate(t.id)}
                className={`w-full p-3 rounded-xl text-left transition-colors flex items-center gap-3 ${
                  defaultTemplate === t.id
                    ? 'bg-accent/15 border border-accent/30'
                    : 'bg-surface border border-transparent hover:border-border'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted truncate">{t.description}</p>
                </div>
                {defaultTemplate === t.id && (
                  <span className="text-accent text-sm">✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* About */}
        <section>
          <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">
            About
          </h3>
          <div className="p-4 rounded-xl bg-surface space-y-2">
            <p className="text-sm font-medium">DiScribe v1.0.0</p>
            <p className="text-xs text-muted">
              Voice recorder PWA with AI transcription and smart templates. Records audio using your browser microphone, sends to a Cloudflare Worker for AI processing, and stores everything locally on your device.
            </p>
            <p className="text-xs text-muted mt-2">
              Built by Divergent Inc
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section>
          <h3 className="text-xs text-muted uppercase tracking-wider font-medium mb-3">
            How It Works
          </h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Record', desc: 'Tap the mic and speak. Audio stays on your device.' },
              { step: '2', title: 'Transcribe', desc: 'Audio is sent to your Cloudflare Worker for AI transcription.' },
              { step: '3', title: 'Process', desc: 'The transcript is processed using your chosen template.' },
              { step: '4', title: 'Review & Share', desc: 'Copy, share, or revisit your structured notes anytime.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur-sm border-t border-border px-5 py-4">
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-colors max-w-lg mx-auto block"
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
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
