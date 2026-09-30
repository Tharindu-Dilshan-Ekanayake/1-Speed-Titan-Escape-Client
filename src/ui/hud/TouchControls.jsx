import { useRef, useState } from 'react'

import { inputState } from '../../game/useKeyboard'

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * On-screen stick + Jump / Grapple for phones and tablets. Writes into the same
 * shared input state as the keyboard; dragging anywhere else on the canvas orbits
 * the camera (see FollowCamera).
 */
export function TouchControls() {
  const base = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  if (!isTouch) return null

  const move = (e) => {
    const rect = base.current.getBoundingClientRect()
    const r = rect.width / 2
    let x = (e.clientX - rect.left - r) / r
    let y = (e.clientY - rect.top - r) / r
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    inputState.joyX = x
    inputState.joyY = y
    setKnob({ x, y })
  }
  const end = () => {
    inputState.joyX = 0
    inputState.joyY = 0
    setKnob({ x: 0, y: 0 })
  }

  return (
    <>
      <div
        ref={base}
        className="pointer-events-auto absolute bottom-[3em] left-[2em] h-[11em] w-[11em] touch-none rounded-full border-[0.25em] border-white/40 bg-[#16102c]/35"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[4.5em] w-[4.5em] rounded-full border-[0.22em] border-[var(--ink)] bg-white/80"
          style={{ transform: `translate(calc(-50% + ${knob.x * 3.2}em), calc(-50% + ${knob.y * 3.2}em))` }}
        />
      </div>
      <div className="pointer-events-auto absolute bottom-[3em] right-[2em] flex items-end gap-[1em]">
        <button
          type="button"
          className="btn b-pink h-[6em] w-[6em] rounded-full"
          onPointerDown={() => {
            inputState.grapplePresses += 1
          }}
        >
          <span className="ol text-[1.3em]">Grapple</span>
        </button>
        <button
          type="button"
          className="btn b-blue h-[7.5em] w-[7.5em] rounded-full"
          onPointerDown={() => {
            inputState.jumpPresses += 1
          }}
        >
          <span className="ol text-[1.6em]">Jump</span>
        </button>
      </div>
    </>
  )
}

export default TouchControls
