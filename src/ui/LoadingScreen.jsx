import { useEffect, useState } from 'react'

import { useBloxity } from '../bloxity/BloxityContext'
import { useNet } from '../net/net'
import { useSession } from '../state/sessionStore'
import { ShoeIcon, TrophyIcon } from './icons'

const TIPS = [
  'Every step makes you faster!',
  'Stand on a treadmill to train - even while AFK.',
  'Press E or Q near a hook to grapple across gaps.',
  'Tap Space twice to double jump.',
  'Reach Level 15, then Rebirth for bonus Wins.',
  'Buy glowing swords in the Store with Wins.',
  'The pink pad next to each gate pays DOUBLE Wins.',
  'Each hero carries their own legendary blade.',
]

/** Shortest time the screen stays up, so it never just flickers. */
const MIN_SHOW_MS = 1400
/** Multiplayer never holds the game back longer than this. */
const NET_GRACE_MS = 4000

/**
 * Themed loading screen. Covers the game until the Bloxity session has settled
 * (signed in, or a guest), the save is loaded and the world has drawn its first
 * frame with the character in it. Deliberately shows no server messages.
 */
export function LoadingScreen({ saveLoaded }) {
  const { status } = useBloxity()
  const worldReady = useSession((s) => s.worldReady)
  const net = useNet((s) => s.status)
  const [start] = useState(() => performance.now())
  const [now, setNow] = useState(() => performance.now())
  const [gone, setGone] = useState(false)
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length))

  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 120)
    const tipId = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2600)
    return () => {
      clearInterval(id)
      clearInterval(tipId)
    }
  }, [])

  const steps = [
    true,
    status === 'ready' || status === 'error',
    saveLoaded,
    worldReady || now - start > 16000,
    net === 'online' || net === 'offline' || net === 'off' || now - start > NET_GRACE_MS,
  ]
  const done = steps.filter(Boolean).length
  const target = done / steps.length
  const elapsed = now - start
  // Ease the bar toward the real progress, with a gentle creep so it never stalls.
  const shown = Math.min(target, 0.12 + elapsed / 9000 + target * 0.9)
  const finished = done === steps.length && elapsed > MIN_SHOW_MS

  useEffect(() => {
    if (!finished) return undefined
    const id = setTimeout(() => setGone(true), 650)
    return () => clearTimeout(id)
  }, [finished])

  if (gone) return null

  return (
    <div
      className="hud pointer-events-auto absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700"
      style={{
        opacity: finished ? 0 : 1,
        background: 'radial-gradient(circle at 50% 40%, #7b3dff 0%, #3a1a8a 45%, #150a3a 100%)',
      }}
    >
      <div className="loading-rays" />
      <div className="checker absolute inset-0 opacity-40" />

      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-[0.4em]" style={{ animation: 'run-bounce 0.5s ease-in-out infinite' }}>
          <ShoeIcon size={5} />
        </div>
        <h1 className="title-font mt-[0.2em] flex gap-[0.25em] text-[7.5em] leading-[1.05]">
          <span className="logo-text logo-cyan" data-text="+1">
            +1
          </span>
          <span className="logo-text logo-gold" data-text="SPEED">
            SPEED
          </span>
        </h1>
        <h2 className="title-font -mt-[0.1em] text-[4.2em] leading-none">
          <span className="logo-text logo-white" data-text="TITAN ESCAPE">
            TITAN ESCAPE
          </span>
        </h2>

        <div className="mt-[1.6em] w-[min(80vw,34em)]">
          <div
            className="checker relative h-[2.6em] overflow-hidden rounded-full border-[0.25em] border-[var(--ink)] bg-[#e9e7f7]"
            style={{ boxShadow: '0 0.25em 0 var(--ink)' }}
          >
            <div
              className="loading-bar-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
              style={{ width: `${Math.round(shown * 100)}%` }}
            />
            <span className="ol absolute inset-0 flex items-center justify-center text-[1.5em]">
              {Math.round(shown * 100)}%
            </span>
          </div>
        </div>

        <div className="mt-[1.2em] flex items-center gap-[0.5em] rounded-full bg-[#16102c]/60 px-[1.2em] py-[0.35em]">
          <TrophyIcon size={1.8} />
          <span key={tip} className="ol-sm anim-pop text-[1.4em]">
            {TIPS[tip]}
          </span>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
