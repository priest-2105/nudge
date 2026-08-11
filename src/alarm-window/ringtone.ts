// Synthesizes the alarm ring tone with the Web Audio API instead of shipping
// an audio asset — a repeating two-tone beep pattern, looped until stopped.
let audioContext: AudioContext | null = null
let stopTimer: number | null = null

const BEEP_HZ = [880, 660]
const BEEP_DURATION_S = 0.18
const BEEP_GAP_S = 0.12
const PATTERN_GAP_S = 0.5

function scheduleBeep(ctx: AudioContext, startAt: number, frequency: number): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.15, startAt)
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + BEEP_DURATION_S)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + BEEP_DURATION_S)
}

function scheduleLoop(): void {
  if (!audioContext) return
  const patternStart = audioContext.currentTime + 0.05
  let t = patternStart
  for (const hz of BEEP_HZ) {
    scheduleBeep(audioContext, t, hz)
    t += BEEP_DURATION_S + BEEP_GAP_S
  }
  const patternDurationMs = (t - patternStart + PATTERN_GAP_S) * 1000
  stopTimer = window.setTimeout(scheduleLoop, patternDurationMs)
}

export function startRingtone(): void {
  if (audioContext) return
  audioContext = new AudioContext()
  scheduleLoop()
}

export function stopRingtone(): void {
  if (stopTimer) {
    window.clearTimeout(stopTimer)
    stopTimer = null
  }
  audioContext?.close()
  audioContext = null
}
