import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// ── Schema ──

export interface Recording {
  id: string
  title: string
  templateId: string
  date: string
  duration: number
  audioBlob: Blob
  status: 'recorded' | 'transcribing' | 'transcribed' | 'processing' | 'done' | 'error'
  transcript?: TranscriptResult
  result?: ProcessedResult
  error?: string
}

export interface TranscriptResult {
  segments: { start: number; end: number; text: string }[]
  fullText: string
}

export interface ProcessedResult {
  templateId: string
  templateName: string
  content: Record<string, any>
  generatedAt: string
}

export interface AppSettings {
  workerUrl: string
  defaultTemplate: string
}

interface DiScribeDB extends DBSchema {
  recordings: {
    key: string
    value: Recording
    indexes: { 'by-date': string }
  }
  settings: {
    key: string
    value: any
  }
}

// ── Database ──

const DB_NAME = 'discribe-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<DiScribeDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DiScribeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const recordingStore = db.createObjectStore('recordings', { keyPath: 'id' })
        recordingStore.createIndex('by-date', 'date')
        db.createObjectStore('settings')
      }
    })
  }
  return dbPromise
}

// ── Recordings ──

export async function saveRecording(recording: Recording): Promise<void> {
  const db = await getDB()
  await db.put('recordings', recording)
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const db = await getDB()
  return db.get('recordings', id)
}

export async function getAllRecordings(): Promise<Recording[]> {
  const db = await getDB()
  const all = await db.getAll('recordings')
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function updateRecording(id: string, updates: Partial<Recording>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('recordings', id)
  if (!existing) throw new Error(`Recording ${id} not found`)
  await db.put('recordings', { ...existing, ...updates })
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('recordings', id)
}

// ── Settings ──

const DEFAULT_SETTINGS: AppSettings = {
  workerUrl: '',
  defaultTemplate: 'meeting-minutes'
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const saved = await db.get('settings', 'app-settings')
  return { ...DEFAULT_SETTINGS, ...(saved || {}) }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings, 'app-settings')
}

// ── Helpers ──

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
