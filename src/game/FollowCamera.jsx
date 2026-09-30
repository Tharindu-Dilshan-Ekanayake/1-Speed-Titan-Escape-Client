import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

import { useSession } from '../state/sessionStore'

/** How high above the player's origin the camera aims. */
const LOOK_HEIGHT = 1.4

const MIN_DISTANCE = 3
const MAX_DISTANCE = 26
const START_DISTANCE = 10

// Pitch limits, in radians. Stops the camera flipping over the top or sinking
// under the track.
const MIN_PITCH = -0.15
const MAX_PITCH = 1.25
const START_PITCH = 0.32

const DRAG_SENSITIVITY = 0.005
const ZOOM_SENSITIVITY = 0.01

// Higher = snappier. Framerate-independent via the pow() smoothing below.
const POSITION_SMOOTHING = 4
const LOOK_SMOOTHING = 8

const _desired = new Vector3()
const _target = new Vector3()
const _toCam = new Vector3()
/** Gap kept between the camera and whatever it would otherwise clip into. */
const CAMERA_PADDING = 0.35

/**
 * Third-person orbit camera.
 *
 * Trails the player's rigid body, easing both position and look-at target.
 * Right-click drag orbits, the mouse wheel zooms.
 *
 * Reads the Rapier body directly rather than React state - the body is the
 * authoritative transform and updates every physics step, not every render.
 * Must live inside <Physics>: it raycasts the world to avoid clipping into walls.
 *
 * @param {{ bodyRef: React.MutableRefObject<any> }} props
 */
export function FollowCamera({ bodyRef }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const { rapier, world } = useRapier()

  // Spherical offset from the player. A ref, not state: pointer events write to it
  // every mousemove and the frame loop reads it - re-rendering would be wasteful.
  const orbit = useRef({ yaw: 0, pitch: START_PITCH, distance: START_DISTANCE })
  const lookAt = useRef(new Vector3())
  const initialised = useRef(false)
  const snapSeq = useRef(0)

  useEffect(() => {
    const el = gl.domElement
    if (!el) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const onPointerDown = (e) => {
      // Right mouse button, or a finger dragging on the canvas (mobile).
      if (e.button !== 2 && e.pointerType !== 'touch') return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      const o = orbit.current
      o.yaw -= dx * DRAG_SENSITIVITY
      o.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, o.pitch + dy * DRAG_SENSITIVITY))
    }

    const endDrag = (e) => {
      if (!dragging) return
      dragging = false
      el.releasePointerCapture?.(e.pointerId)
    }

    const onWheel = (e) => {
      // Without this the page scrolls behind the canvas.
      e.preventDefault()
      const o = orbit.current
      o.distance = Math.min(
        MAX_DISTANCE,
        Math.max(MIN_DISTANCE, o.distance + e.deltaY * ZOOM_SENSITIVITY),
      )
    }

    // Right-dragging otherwise opens the browser context menu mid-orbit.
    const onContextMenu = (e) => e.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('contextmenu', onContextMenu)
    // passive:false is required for preventDefault() on wheel to take effect.
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('contextmenu', onContextMenu)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((_state, delta) => {
    const body = bodyRef.current
    if (!body) return

    // A teleport snaps the camera behind the player instead of swooping across
    // the map.
    const { cameraSnap, cameraYaw } = useSession.getState()
    if (cameraSnap !== snapSeq.current) {
      snapSeq.current = cameraSnap
      orbit.current.yaw = cameraYaw
      initialised.current = false
    }

    const pos = body.translation()
    _target.set(pos.x, pos.y, pos.z)

    // Spherical -> cartesian. yaw 0 puts the camera behind the player on +Z.
    const { yaw, pitch, distance } = orbit.current
    const horizontal = Math.cos(pitch) * distance
    _desired.set(
      _target.x + Math.sin(yaw) * horizontal,
      _target.y + Math.sin(pitch) * distance + LOOK_HEIGHT,
      _target.z + Math.cos(yaw) * horizontal,
    )

    if (!initialised.current) {
      // Avoid a long swoop in from wherever the default camera started.
      camera.position.copy(_desired)
      lookAt.current.copy(_target).setY(_target.y + LOOK_HEIGHT)
      initialised.current = true
    }

    // 1 - pow(x, delta) keeps the easing rate consistent across framerates.
    camera.position.lerp(_desired, 1 - Math.pow(0.001, delta * (POSITION_SMOOTHING / 10)))

    _target.y += LOOK_HEIGHT

    // Keep the camera on the player's side of walls, pillars and ceilings: cast from
    // the look point toward the camera and pull in to just before the first hit.
    _toCam.subVectors(camera.position, _target)
    const dist = _toCam.length()
    if (dist > 0.01) {
      _toCam.divideScalar(dist)
      const ray = new rapier.Ray(_target, _toCam)
      const hit = world.castRay(ray, dist, true, undefined, undefined, undefined, body)
      if (hit && hit.timeOfImpact < dist) {
        const safe = Math.max(MIN_DISTANCE * 0.4, hit.timeOfImpact - CAMERA_PADDING)
        camera.position.copy(_target).addScaledVector(_toCam, safe)
      }
    }

    lookAt.current.lerp(_target, 1 - Math.pow(0.001, delta * (LOOK_SMOOTHING / 10)))
    camera.lookAt(lookAt.current)
  })

  return null
}

export default FollowCamera
