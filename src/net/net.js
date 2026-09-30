import { Client } from '@colyseus/sdk'
import { create } from 'zustand'

/**
 * Multiplayer link (Colyseus). Up to 8 players share a lobby; the server fills a
 * lobby to 8 and opens a new one for the next player.
 *
 * Silent by design: nothing from the server is ever shown as text. If the server
 * can't be reached the game simply keeps running solo and retries in the
 * background.
 *
 * Endpoints (Vite env):
 *   VITE_NET_MODE      'legion' (Bloxity matchmaker) | 'direct' | 'off'
 *   VITE_GAME_ID       Bloxity game id (legion mode)
 *   VITE_SERVER_URL    Colyseus URL for direct mode (default ws://localhost:2567)
 */
const MODE = import.meta.env.VITE_NET_MODE || (import.meta.env.DEV ? 'direct' : 'legion')
const GAME_ID = import.meta.env.VITE_GAME_ID || 'speed-titan-escape'
const DIRECT_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567'
const MATCHMAKER = import.meta.env.VITE_MATCHMAKER_URL || 'https://play.bloxity.io'

const POSE_HZ = 12
/** Remote poses render this far in the past, so there are always two to blend. */
export const INTERP_DELAY_MS = 140

export const useNet = create((set) => ({
  /** 'off' | 'connecting' | 'online' | 'offline' */
  status: 'off',
  /** sessionId -> profile */
  players: {},
  selfId: null,
  setStatus: (status) => set({ status }),
}))

/** sessionId -> [{ t, x, y, z, yaw, speed, flags, world, stage }] newest last */
export const remotePoses = new Map()
/** sessionId -> { k, t } latest effect (jump / win / levelup ...) */
export const remoteFx = new Map()

let room = null
let pendingPose = null
let lastSent = ''
let sendTimer = null
let retry = 0
let started = false
let profileProvider = () => ({})

async function openRoom() {
  if (MODE === 'legion') {
    const res = await fetch(`${MATCHMAKER}/v1/play/${GAME_ID}`, { method: 'POST' })
    if (!res.ok) throw new Error('matchmaker')
    const { roomId } = await res.json()
    const client = new Client(`${MATCHMAKER.replace(/^http/, 'ws')}/v1/ws/${roomId}`)
    return client.joinOrCreate('lobby', profileProvider())
  }
  const client = new Client(DIRECT_URL)
  return client.joinOrCreate('lobby', profileProvider())
}

function upsert(profile) {
  useNet.setState((s) => ({ players: { ...s.players, [profile.id]: { ...s.players[profile.id], ...profile } } }))
}

function drop(id) {
  remotePoses.delete(id)
  remoteFx.delete(id)
  useNet.setState((s) => {
    const players = { ...s.players }
    delete players[id]
    return { players }
  })
}

async function connect() {
  const { setStatus } = useNet.getState()
  setStatus('connecting')
  try {
    room = await openRoom()
  } catch {
    room = null
    setStatus('offline')
    scheduleRetry()
    return
  }
  retry = 0
  useNet.setState({ status: 'online', selfId: room.sessionId, players: {} })

  room.onMessage('roster', (list) => (list || []).forEach(upsert))
  room.onMessage('join', upsert)
  room.onMessage('prof', upsert)
  room.onMessage('leave', ({ id }) => drop(id))
  room.onMessage('fx', ({ id, k }) => remoteFx.set(id, { k, t: performance.now() }))
  room.onMessage('snap', (snap) => {
    const t = performance.now()
    for (const [id, x, y, z, yaw, speed, flags, world, stage] of snap || []) {
      if (id === room?.sessionId) continue
      let buf = remotePoses.get(id)
      if (!buf) remotePoses.set(id, (buf = []))
      buf.push({ t, x, y, z, yaw, speed, flags, world, stage })
      if (buf.length > 6) buf.shift()
    }
  })
  room.onLeave(() => {
    room = null
    remotePoses.clear()
    useNet.setState({ status: 'offline', players: {}, selfId: null })
    scheduleRetry()
  })
  room.onError(() => {})
}

function scheduleRetry() {
  retry += 1
  const wait = Math.min(30000, 2000 * 2 ** Math.min(retry, 4))
  setTimeout(connect, wait)
}

/**
 * Starts the link once. `getProfile()` returns the join/profile payload
 * (name, hero, weapon, avatar, stats).
 */
export function startNet(getProfile) {
  if (started || MODE === 'off') return
  started = true
  profileProvider = getProfile
  connect()
  sendTimer = setInterval(() => {
    if (!room || !pendingPose) return
    const key = pendingPose.map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',')
    if (key === lastSent) return
    lastSent = key
    room.send('s', pendingPose)
  }, 1000 / POSE_HZ)
}

/** Latest local pose; sent at POSE_HZ when it changes. */
export function publishPose(pose) {
  pendingPose = pose
}

export function sendProfile(patch) {
  room?.send('p', patch)
}

export function sendFx(k) {
  room?.send('fx', { k })
}

export function stopNet() {
  clearInterval(sendTimer)
  room?.leave()
}
