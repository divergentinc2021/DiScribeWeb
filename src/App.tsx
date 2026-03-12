import { useEffect } from 'react'
import { useStore } from './lib/store'
import { HomeView } from './components/HomeView'
import { RecorderView } from './components/RecorderView'
import { RecordingView } from './components/RecordingView'
import { ResultView } from './components/ResultView'
import { SettingsPanel } from './components/SettingsPanel'

export default function App() {
  const { view, loadRecordings, loadSettings } = useStore()

  useEffect(() => {
    loadSettings()
    loadRecordings()
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text safe-top safe-bottom">
      {view === 'home' && <HomeView />}
      {view === 'recorder' && <RecorderView />}
      {view === 'recording' && <RecordingView />}
      {view === 'result' && <ResultView />}
      {view === 'settings' && <SettingsPanel />}
    </div>
  )
}
