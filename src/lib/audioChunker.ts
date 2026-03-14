/**
 * Audio Chunker — decodes audio to PCM, downsamples to 16kHz mono,
 * splits by time, re-encodes as WAV chunks.
 *
 * This ensures every chunk sent to Whisper is a valid, complete audio file
 * (unlike raw byte splitting which corrupts codec frames).
 */

const CHUNK_DURATION = 25 // seconds per chunk
const TARGET_SAMPLE_RATE = 16000 // Whisper's native rate — also keeps chunks small (~800KB)

export interface AudioChunk {
  blob: Blob
  startTime: number // seconds
  endTime: number   // seconds
  index: number
  total: number
}

/**
 * Decode an audio blob (WebM/MP4/WAV/etc.) into time-based 16kHz mono WAV chunks.
 * Uses OfflineAudioContext to downsample from the browser's native rate.
 */
export async function chunkAudio(
  audioBlob: Blob,
  onProgress?: (msg: string) => void
): Promise<AudioChunk[]> {
  onProgress?.('Decoding audio…')

  // Decode to raw PCM using AudioContext
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  await audioContext.close()

  const totalDuration = audioBuffer.duration

  // Downsample to 16kHz mono using OfflineAudioContext
  onProgress?.('Downsampling to 16kHz…')
  const totalSamples16k = Math.ceil(totalDuration * TARGET_SAMPLE_RATE)
  const offlineCtx = new OfflineAudioContext(1, totalSamples16k, TARGET_SAMPLE_RATE)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)
  const resampledBuffer = await offlineCtx.startRendering()

  const totalChunks = Math.ceil(totalDuration / CHUNK_DURATION)
  onProgress?.(`Splitting into ${totalChunks} chunks (${Math.round(totalDuration)}s total)…`)

  const chunks: AudioChunk[] = []
  const channelData = resampledBuffer.getChannelData(0) // mono

  for (let i = 0; i < totalChunks; i++) {
    const startTime = i * CHUNK_DURATION
    const endTime = Math.min(startTime + CHUNK_DURATION, totalDuration)
    const startSample = Math.floor(startTime * TARGET_SAMPLE_RATE)
    const endSample = Math.min(Math.floor(endTime * TARGET_SAMPLE_RATE), channelData.length)

    const chunkSamples = channelData.subarray(startSample, endSample)

    // Encode as 16-bit PCM WAV at 16kHz mono (~800KB per 25s chunk)
    const wavBlob = encodeWav(chunkSamples, TARGET_SAMPLE_RATE)

    chunks.push({
      blob: wavBlob,
      startTime,
      endTime,
      index: i,
      total: totalChunks,
    })
  }

  return chunks
}

/**
 * Encode Float32Array PCM samples into a WAV blob (16-bit mono).
 */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length
  const bitsPerSample = 16
  const numChannels = 1
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * (bitsPerSample / 8)
  const headerSize = 44
  const buffer = new ArrayBuffer(headerSize + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)           // chunk size
  view.setUint16(20, 1, true)            // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // PCM samples: clamp Float32 → Int16
  const offset = 44
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF
    view.setInt16(offset + i * 2, val, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
