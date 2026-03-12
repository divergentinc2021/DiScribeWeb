import { create } from 'zustand'
import type { Recording, AppSettings, TranscriptResult, ProcessedResult } from './db'
import * as db from './db'

// ── Types ──

export type View = 'home' | 'recorder' | 'recording' | 'result' | 'settings'

interface AppState {
  // Navigation
  view: View
  selectedRecordingId: string | null
  setView: (view: View) => void
  openRecording: (id: string) => void
  openResult: (id: string) => void

  // Recordings
  recordings: Recording[]
  currentRecording: Recording | null
  loadRecordings: () => Promise<void>
  loadRecording: (id: string) => Promise<void>
  addRecording: (recording: Recording) => Promise<void>
  updateRecording: (id: string, updates: Partial<Recording>) => Promise<void>
  deleteRecording: (id: string) => Promise<void>

  // Settings
  settings: AppSettings
  loadSettings: () => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>

  // Processing state
  processing: {
    status: string
    progress?: number
  } | null
  setProcessing: (p: { status: string; progress?: number } | null) => void

  // Recording state
  isRecording: boolean
  recordingDuration: number
  setIsRecording: (v: boolean) => void
  setRecordingDuration: (d: number) => void

  // Template selection (for new recordings)
  selectedTemplateId: string
  setSelectedTemplateId: (id: string) => void
}

// ── Store ──

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  view: 'home',
  selectedRecordingId: null,
  setView: (view) => set({ view }),
  openRecording: (id) => set({ view: 'recording', selectedRecordingId: id }),
  openResult: (id) => set({ view: 'result', selectedRecordingId: id }),

  // Recordings
  recordings: [],
  currentRecording: null,

  loadRecordings: async () => {
    const recordings = await db.getAllRecordings()
    set({ recordings })
  },

  loadRecording: async (id) => {
    const recording = await db.getRecording(id)
    set({ currentRecording: recording || null })
  },

  addRecording: async (recording) => {
    await db.saveRecording(recording)
    const recordings = await db.getAllRecordings()
    set({ recordings })
  },

  updateRecording: async (id, updates) => {
    await db.updateRecording(id, updates)
    const recordings = await db.getAllRecordings()
    const current = get().currentRecording
    if (current?.id === id) {
      const updated = await db.getRecording(id)
      set({ recordings, currentRecording: updated || null })
    } else {
      set({ recordings })
    }
  },

  deleteRecording: async (id) => {
    await db.deleteRecording(id)
    const recordings = await db.getAllRecordings()
    set({ recordings, view: 'home', selectedRecordingId: null, currentRecording: null })
  },

  // Settings
  settings: { workerUrl: '', defaultTemplate: 'meeting-minutes' },

  loadSettings: async () => {
    const settings = await db.getSettings()
    set({ settings, selectedTemplateId: settings.defaultTemplate })
  },

  saveSettings: async (settings) => {
    await db.saveSettings(settings)
    set({ settings })
  },

  // Processing
  processing: null,
  setProcessing: (p) => set({ processing: p }),

  // Recording state
  isRecording: false,
  recordingDuration: 0,
  setIsRecording: (v) => set({ isRecording: v }),
  setRecordingDuration: (d) => set({ recordingDuration: d }),

  // Template
  selectedTemplateId: 'meeting-minutes',
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
}))
