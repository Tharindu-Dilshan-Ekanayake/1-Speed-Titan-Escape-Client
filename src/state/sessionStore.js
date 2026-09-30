import { create } from 'zustand'

/**
 * Session-only state: where the player is, what's open, transient HUD events.
 * Never saved. The game loop writes here (sparingly - only on change) and the HUD
 * reads it.
 */
let nextId = 1
const uid = () => (nextId += 1)

export const useSession = create((set, get) => ({
  /** Open panel id ('heroes' | 'store' | ...) and optional payload. */
  panel: null,
  panelData: null,
  openPanel: (panel, panelData = null) => set({ panel, panelData }),
  closePanel: () => set({ panel: null, panelData: null }),

  /** The world has drawn with the character in it (ends the loading screen). */
  worldReady: false,
  setWorldReady: () => set({ worldReady: true }),

  world: 1,
  /** 0 while in a hub, otherwise the stage the player is standing in. */
  stage: 0,
  setLocation: (world, stage) => {
    const s = get()
    if (s.world !== world || s.stage !== stage) set({ world, stage })
  },

  treadmillId: null,
  setTreadmill: (treadmillId) => {
    if (get().treadmillId !== treadmillId) set({ treadmillId })
  },

  jumpsLeft: 2,
  setJumpsLeft: (jumpsLeft) => {
    if (get().jumpsLeft !== jumpsLeft) set({ jumpsLeft })
  },

  /** Set while the revive prompt is up: { world, stage }. */
  dead: null,
  setDead: (dead) => set({ dead }),

  /** Hook id the player would grab if they pressed E now. */
  grappleTarget: null,
  setGrappleTarget: (grappleTarget) => {
    if (get().grappleTarget !== grappleTarget) set({ grappleTarget })
  },

  /** Teleport request consumed by the player controller. */
  teleport: null,
  requestTeleport: (pos, yaw = 0) => set({ teleport: { pos, yaw, seq: uid() } }),
  clearTeleport: () => set({ teleport: null }),

  /** Bumped on every teleport so the camera snaps instead of swooping. */
  cameraSnap: 0,
  cameraYaw: 0,
  snapCamera: (yaw = 0) => set({ cameraSnap: get().cameraSnap + 1, cameraYaw: yaw }),

  toasts: [],
  toast: (text, color = '#ffd43a', icon = null) => {
    const id = uid()
    set({ toasts: [...get().toasts, { id, text, color, icon }].slice(-4) })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600)
  },

  stepPopups: [],
  popStep: (amount) => {
    const id = uid()
    const popup = { id, amount, x: 38 + Math.random() * 24, y: 38 + Math.random() * 22 }
    set({ stepPopups: [...get().stepPopups, popup].slice(-8) })
    setTimeout(() => set({ stepPopups: get().stepPopups.filter((p) => p.id !== id) }), 1100)
  },

  banner: null,
  showBanner: (text, sub = null) => {
    const id = uid()
    set({ banner: { id, text, sub } })
    setTimeout(() => {
      if (get().banner?.id === id) set({ banner: null })
    }, 2200)
  },

  /** Big win flash when a pad pays out. */
  winFlash: null,
  flashWin: (amount) => {
    const id = uid()
    set({ winFlash: { id, amount } })
    setTimeout(() => {
      if (get().winFlash?.id === id) set({ winFlash: null })
    }, 1800)
  },
}))
