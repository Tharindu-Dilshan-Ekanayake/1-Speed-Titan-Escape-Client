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

import { HEROES } from '../../config/heroes'
import { buildHero } from './buildHero'

/**
 * Bust portraits for UI cards, rendered once with a throwaway WebGL context and
 * cached as data URLs. Generated lazily the first time any card asks.
 */
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
  scene.add(new HemisphereLight('#ffffff', '#8a86b8', 2.2))
  const sun = new DirectionalLight('#ffffff', 2.2)
  sun.position.set(2, 4, 5)
  scene.add(sun)

  const camera = new PerspectiveCamera(30, 1, 0.1, 20)
  camera.position.set(0.55, 1.75, 2.6)
  camera.lookAt(0, 1.5, 0)

  const out = {}
  for (const def of HEROES) {
    const hero = buildHero(def)
    hero.root.rotation.y = 0.35
    hero.update({ speed: 0, grounded: true }, 0.4, 0)
    scene.add(hero.root)
    renderer.render(scene, camera)
    out[def.id] = renderer.domElement.toDataURL('image/png')
    scene.remove(hero.root)
    hero.dispose()
  }
  renderer.dispose()
  renderer.forceContextLoss?.()
  return out
}

function ensure() {
  if (portraits) return
  portraits = {}
  // Defer so the first panel paint isn't blocked.
  setTimeout(() => {
    try {
      portraits = renderAll()
    } catch (err) {
      console.warn('[heroes] portrait render failed', err)
    }
    listeners.forEach((l) => l())
  }, 30)
}

function subscribe(listener) {
  listeners.add(listener)
  ensure()
  return () => listeners.delete(listener)
}

/** Data URL of a hero's portrait, or undefined while rendering. */
export function useHeroPortrait(id) {
  return useSyncExternalStore(subscribe, () => portraits?.[id])
}
