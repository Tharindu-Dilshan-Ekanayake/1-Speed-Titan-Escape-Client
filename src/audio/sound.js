/**
 * All game audio, synthesised live with Web Audio - no files to download.
 *
 *   sound.play('jump')        one-shot effects (see SFX)
 *   sound.setMusic(true)      the looping adventure theme
 *   sound.setSfx(false)
 *
 * The AudioContext is created on the first user gesture (browsers block audio
 * before that); anything played earlier is silently dropped.
 */

let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let noiseBuffer = null
let musicOn = true
let sfxOn = true
let musicTimer = null
let echo = null
let bellBus = null
const lastPlayed = new Map()
/** Bus levels: the music sits softly under the effects. */
const SFX_VOL = 0.6
const MUSIC_VOL = 0.07

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.9
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 4
  master.connect(comp).connect(ctx.destination)
  sfxBus = ctx.createGain()
  sfxBus.gain.value = sfxOn ? SFX_VOL : 0
  sfxBus.connect(master)
  musicBus = ctx.createGain()
  musicBus.gain.value = musicOn ? MUSIC_VOL : 0
  // Warm and soft: roll off the highs, and give the bells a slow echo.
  const warm = ctx.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 2600
  musicBus.connect(warm).connect(master)
  echo = ctx.createDelay(1)
  echo.delayTime.value = 60 / BPM * 0.75
  const feedback = ctx.createGain()
  feedback.gain.value = 0.35
  const wet = ctx.createGain()
  wet.gain.value = 0.5
  echo.connect(feedback).connect(echo)
  echo.connect(wet).connect(musicBus)
  bellBus = ctx.createGain()
  bellBus.connect(musicBus)
  bellBus.connect(echo)
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noiseBuffer.getChannelData(0)
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1
  return ctx
}

function unlock() {
  if (!ensure()) return
  if (ctx.state === 'suspended') ctx.resume()
  if (musicOn) startMusic()
}

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, unlock, { passive: true })
  }
}

const ready = () => ctx && ctx.state === 'running'

/* --- Voices -------------------------------------------------------------------- */

function tone(freq, { type = 'square', start = 0, dur = 0.12, vol = 0.3, to = null, bus = sfxBus, attack = 0.005 } = {}) {
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(bus)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise({ start = 0, dur = 0.2, vol = 0.3, type = 'lowpass', freq = 1200, to = null, q = 1, bus = sfxBus } = {}) {
  const t = ctx.currentTime + start
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(freq, t)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(bus)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.02)
}

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12)

const SFX = {
  step: () => noise({ dur: 0.05, vol: 0.05, type: 'highpass', freq: 2400 }),
  // Footfalls: a soft thud with a little scuff; running lands harder.
  footstep: () => {
    const p = 0.9 + Math.random() * 0.2
    tone(95 * p, { type: 'sine', to: 55, dur: 0.07, vol: 0.2 })
    noise({ dur: 0.06, vol: 0.12, type: 'bandpass', freq: 900 * p, q: 1.2 })
  },
  run: () => {
    const p = 0.9 + Math.random() * 0.2
    tone(110 * p, { type: 'sine', to: 50, dur: 0.08, vol: 0.28 })
    noise({ dur: 0.08, vol: 0.18, type: 'bandpass', freq: 1100 * p, to: 500, q: 1.1 })
  },
  jump: () => {
    tone(260, { type: 'triangle', to: 560, dur: 0.16, vol: 0.2 })
    noise({ dur: 0.22, vol: 0.14, type: 'bandpass', freq: 500, to: 1800, q: 1.4 })
  },
  // Double jump = a front flip: an airy spinning whoosh.
  doublejump: () => {
    tone(420, { type: 'triangle', to: 900, dur: 0.14, vol: 0.16 })
    noise({ dur: 0.42, vol: 0.2, type: 'bandpass', freq: 400, to: 2600, q: 2.2 })
    noise({ dur: 0.3, vol: 0.1, type: 'bandpass', freq: 2600, to: 600, q: 2.2, start: 0.18 })
  },
  land: () => {
    tone(80, { type: 'sine', to: 40, dur: 0.14, vol: 0.3 })
    noise({ dur: 0.14, vol: 0.18, type: 'lowpass', freq: 500 })
  },
  grapple: () => {
    tone(900, { type: 'sawtooth', to: 220, dur: 0.18, vol: 0.12 })
    noise({ dur: 0.35, vol: 0.2, type: 'bandpass', freq: 600, to: 2600, q: 1.5 })
  },
  bounce: () => {
    tone(180, { type: 'sine', to: 900, dur: 0.3, vol: 0.35 })
    tone(360, { type: 'triangle', to: 1400, dur: 0.25, vol: 0.12, start: 0.03 })
  },
  splash: () => {
    noise({ dur: 0.5, vol: 0.35, type: 'lowpass', freq: 1800, to: 300 })
    noise({ dur: 0.25, vol: 0.15, type: 'highpass', freq: 3000, start: 0.05 })
  },
  crumble: () => noise({ dur: 0.35, vol: 0.18, type: 'bandpass', freq: 500, to: 180, q: 3 }),
  death: () => {
    tone(420, { type: 'sawtooth', to: 70, dur: 0.6, vol: 0.2 })
    noise({ dur: 0.5, vol: 0.2, type: 'lowpass', freq: 900, to: 120 })
  },
  win: () => {
    ;[72, 76, 79, 84, 88].forEach((n, i) => tone(NOTE(n), { type: 'triangle', start: i * 0.07, dur: 0.35, vol: 0.2 }))
    ;[84, 88, 91].forEach((n) => tone(NOTE(n), { type: 'square', start: 0.38, dur: 0.6, vol: 0.08 }))
    noise({ start: 0.35, dur: 0.6, vol: 0.08, type: 'highpass', freq: 6000 })
  },
  levelup: () => {
    ;[67, 71, 74, 79, 83, 86].forEach((n, i) => tone(NOTE(n), { type: 'square', start: i * 0.055, dur: 0.22, vol: 0.12 }))
    ;[79, 83, 86].forEach((n) => tone(NOTE(n), { type: 'triangle', start: 0.36, dur: 0.7, vol: 0.14 }))
  },
  rebirth: () => {
    noise({ dur: 1.2, vol: 0.25, type: 'bandpass', freq: 200, to: 6000, q: 1 })
    ;[60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), { type: 'triangle', start: 0.3 + i * 0.06, dur: 0.9, vol: 0.12 }))
  },
  buy: () => {
    tone(NOTE(83), { dur: 0.08, vol: 0.18 })
    tone(NOTE(88), { dur: 0.3, vol: 0.18, start: 0.08 })
  },
  deny: () => {
    tone(160, { type: 'square', dur: 0.12, vol: 0.14 })
    tone(120, { type: 'square', dur: 0.18, vol: 0.14, start: 0.12 })
  },
  click: () => tone(NOTE(79), { type: 'triangle', dur: 0.06, vol: 0.14 }),
  open: () => {
    tone(NOTE(72), { type: 'triangle', dur: 0.08, vol: 0.12 })
    tone(NOTE(79), { type: 'triangle', dur: 0.12, vol: 0.12, start: 0.06 })
  },
  gate: () => {
    ;[84, 88, 91, 96].forEach((n, i) => tone(NOTE(n), { type: 'sine', start: i * 0.04, dur: 0.3, vol: 0.1 }))
    noise({ dur: 0.4, vol: 0.08, type: 'highpass', freq: 5000 })
  },
  hit: () => {
    tone(140, { type: 'square', to: 60, dur: 0.18, vol: 0.25 })
    noise({ dur: 0.15, vol: 0.25, type: 'lowpass', freq: 1500 })
  },
}

/* --- Music: a calm, dreamy loop -------------------------------------------------- */

const BPM = 72
const STEP = 60 / BPM / 2 // eighth notes
// Cmaj7 - Am7 - Fmaj7 - Gsus, one bar each: roots + soft pad voicings.
const CHORDS = [
  [36, 60, 64, 67, 71],
  [33, 57, 60, 64, 67],
  [29, 57, 60, 65, 69],
  [31, 55, 60, 62, 67],
]
// Music-box melody on a C major pentatonic, lots of air between notes.
const MELODY = [
  76, 0, 79, 0, 0, 0, 74, 0,
  72, 0, 0, 0, 76, 0, 0, 0,
  77, 0, 76, 0, 0, 72, 0, 0,
  74, 0, 0, 0, 0, 0, 0, 0,
  76, 0, 79, 0, 0, 0, 81, 0,
  79, 0, 0, 76, 0, 0, 0, 0,
  77, 0, 0, 76, 74, 0, 72, 0,
  74, 0, 0, 0, 67, 0, 0, 0,
]
let musicStep = 0
let nextTime = 0

function scheduleMusic() {
  if (!ready() || !musicOn) return
  while (nextTime < ctx.currentTime + 0.3) {
    const bar = Math.floor(musicStep / 8) % 4
    const s = musicStep % 8
    const chord = CHORDS[bar]
    const at = nextTime - ctx.currentTime
    const barLen = STEP * 8
    if (s === 0) {
      // Slow-swelling pad for the whole bar.
      for (const n of chord.slice(1)) {
        tone(NOTE(n), { type: 'sine', start: at, dur: barLen * 1.1, vol: 0.09, attack: barLen * 0.35, bus: musicBus })
        tone(NOTE(n) * 1.003, { type: 'triangle', start: at, dur: barLen * 1.1, vol: 0.03, attack: barLen * 0.4, bus: musicBus })
      }
    }
    // Soft bass on beats one and three.
    if (s === 0 || s === 4) tone(NOTE(chord[0]), { type: 'sine', start: at, dur: STEP * 3.5, vol: 0.32, attack: 0.04, bus: musicBus })
    // Gentle broken-chord ripple on the off-beats.
    if (s % 2 === 1) tone(NOTE(chord[1 + ((s >> 1) % 4)] + 12), { type: 'sine', start: at, dur: STEP * 1.6, vol: 0.05, attack: 0.02, bus: bellBus })
    // Bell melody.
    const m = MELODY[musicStep % MELODY.length]
    if (m) {
      tone(NOTE(m), { type: 'sine', start: at, dur: STEP * 3, vol: 0.11, attack: 0.01, bus: bellBus })
      tone(NOTE(m) * 2, { type: 'sine', start: at, dur: STEP * 1.2, vol: 0.025, attack: 0.005, bus: bellBus })
    }
    musicStep += 1
    nextTime += STEP
  }
}

function startMusic() {
  if (musicTimer || !ready()) return
  nextTime = ctx.currentTime + 0.1
  musicTimer = setInterval(scheduleMusic, 50)
}

function stopMusic() {
  clearInterval(musicTimer)
  musicTimer = null
}

export const sound = {
  /** Plays an effect. `minGap` (s) rate-limits spammy ones like footsteps. */
  play(name, minGap = 0.03) {
    if (!sfxOn || !ready() || !SFX[name]) return
    const now = ctx.currentTime
    if (now - (lastPlayed.get(name) ?? -1) < minGap) return
    lastPlayed.set(name, now)
    SFX[name]()
  },
  setMusic(on) {
    musicOn = on
    if (!ctx) return
    musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.4)
    if (on) startMusic()
    else stopMusic()
  },
  setSfx(on) {
    sfxOn = on
    if (sfxBus) sfxBus.gain.setTargetAtTime(on ? SFX_VOL : 0, ctx.currentTime, 0.05)
  },
}
