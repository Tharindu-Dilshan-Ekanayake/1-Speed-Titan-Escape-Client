import { useEffect } from 'react'

import { useBloxity } from '../bloxity/BloxityContext'
import { snapshotProgress, useProgress } from './progressStore'

/**
 * Local save, one slot per Bloxity identity (logged-in user id, else the guest id).
 * Frontend-only until the server exists; the saved object is exactly
 * `snapshotProgress()`, so it can be POSTed as-is later.
 */
const PREFIX = 'speedTitan:save:'
const SAVE_DEBOUNCE_MS = 800

function readSave(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSave(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data))
  } catch {
    // Private mode / quota: the session still plays, it just won't persist.
  }
}

export function usePersistence() {
  const { user, guest, status } = useBloxity()
  // Wait for the SDK to settle so a returning player doesn't briefly load the
  // guest slot. If the SDK fails entirely, fall back to a local slot.
  const key =
    status === 'ready' || status === 'error'
      ? String(user?.id ?? user?.userId ?? guest?.id ?? guest?.guestId ?? 'local')
      : null

  useEffect(() => {
    if (!key) return undefined
    useProgress.getState().load(readSave(key))

    let timer = null
    const flush = () => {
      clearTimeout(timer)
      timer = null
      writeSave(key, snapshotProgress())
    }
    const unsubscribe = useProgress.subscribe(() => {
      if (!timer) timer = setTimeout(flush, SAVE_DEBOUNCE_MS)
    })
    window.addEventListener('beforeunload', flush)
    return () => {
      unsubscribe()
      window.removeEventListener('beforeunload', flush)
      if (timer) flush()
    }
  }, [key])

  // Playtime only counts while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') useProgress.getState().tickPlaytime(1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return key !== null
}
