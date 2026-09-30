import { useEffect } from 'react'

/**
 * Keyboard state in a ref, deliberately *not* React state.
 *
 * Movement is read every frame inside `useFrame`; routing keydown/keyup through
 * React state would re-render the whole scene 60x a second for no benefit.
 *
 * Held keys are booleans. Jump and grapple are also queued as *presses* (`jumpPresses`,
 * `grapplePresses`) because a double jump needs one action per key press, not per
 * frame the key is down. The controller consumes them.
 */
const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  KeyE: 'grapple',
  KeyQ: 'grapple',
}

/** Typing a custom speed in the HUD must not also walk the character. */
function isTyping(e) {
  const tag = e.target?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
}

/**
 * One shared input state. The touch controls write to the same object, so the
 * controller doesn't care where input came from. `joyX/joyY` are an analog stick
 * (-1..1) that overrides the WASD booleans while non-zero.
 */
export const inputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  grapple: false,
  jumpPresses: 0,
  grapplePresses: 0,
  joyX: 0,
  joyY: 0,
}
const keys = { current: inputState }

export function useKeyboard() {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isTyping(e)) return
      const action = KEY_MAP[e.code]
      if (!action) return
      e.preventDefault() // stop Space scrolling the page
      if (!e.repeat) {
        if (action === 'jump') keys.current.jumpPresses += 1
        if (action === 'grapple') keys.current.grapplePresses += 1
      }
      keys.current[action] = true
    }
    const onKeyUp = (e) => {
      const action = KEY_MAP[e.code]
      if (action) keys.current[action] = false
    }
    // Alt-tabbing away mid-run otherwise leaves a key stuck down.
    const onBlur = () => {
      for (const action of Object.values(KEY_MAP)) keys.current[action] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return keys
}

export default useKeyboard
