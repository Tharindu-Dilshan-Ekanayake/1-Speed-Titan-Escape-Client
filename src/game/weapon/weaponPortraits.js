import { useSyncExternalStore } from 'react'
import {
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

import { WEAPONS } from '../../config/weapons'
import { buildWeapon } from './buildWeapon'

/** Store-card pictures of every blade, rendered once offscreen and cached. */
let portraits = null
const listeners = new Set()

function renderAll() {
  const size = 256
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(size, size)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NeutralToneMapping
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()
  scene.add(new HemisphereLight('#ffffff', '#8a86b8', 2.4))
  const sun = new DirectionalLight('#ffffff', 2.4)
  sun.position.set(2, 4, 5)
  scene.add(sun)
  const camera = new PerspectiveCamera(32, 1, 0.1, 20)

  const out = {}
  for (const spec of WEAPONS) {
    const w = buildWeapon(spec)
    w.root.rotation.set(0, 0.5, -0.75)
    w.update(0.6)
    scene.add(w.root)
    const len = w.length + 0.3
    camera.position.set(0.1, len * 0.42, len * 1.9)
    camera.lookAt(0.25, len * 0.38, 0)
    renderer.render(scene, camera)
    out[spec.id] = renderer.domElement.toDataURL('image/png')
    scene.remove(w.root)
    w.dispose()
  }
  renderer.dispose()
  renderer.forceContextLoss?.()
  return out
}

function subscribe(listener) {
  listeners.add(listener)
  if (!portraits) {
    portraits = {}
    setTimeout(() => {
      try {
        portraits = renderAll()
      } catch (err) {
        console.warn('[weapons] portrait render failed', err)
      }
      listeners.forEach((l) => l())
    }, 60)
  }
  return () => listeners.delete(listener)
}

export function useWeaponPortrait(id) {
  return useSyncExternalStore(subscribe, () => portraits?.[id])
}
