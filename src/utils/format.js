const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

/** 3710 -> "3.71K", 12.5 -> "12.5", 999 -> "999". Matches the original's HUD style. */
export function formatNumber(value) {
  const n = Number(value) || 0
  if (Math.abs(n) < 1000) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
  }
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3))
  const scaled = n / 10 ** (tier * 3)
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
  return `${Number(scaled.toFixed(digits))}${SUFFIXES[tier]}`
}

/** Seconds -> "1h 05m" / "4m 09s". */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(r).padStart(2, '0')}s`
}

/** Milliseconds -> "mm:ss" countdown. */
export function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
