import { useProgress } from '../../state/progressStore'
import { SpeakerIcon } from '../icons'

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/** Bottom-right corner: one-tap sound on/off (music + effects). */
export function CornerTools() {
  const on = useProgress((s) => s.settings.music !== false || s.settings.sfx !== false)
  const setSetting = useProgress((s) => s.setSetting)
  const toggle = () => {
    setSetting('music', !on)
    setSetting('sfx', !on)
  }
  return (
    <div
      className={`pointer-events-auto absolute right-[1em] flex flex-col items-end gap-[0.6em] ${isTouch ? 'bottom-[15em]' : 'bottom-[1.2em]'}`}
    >
      <button
        type="button"
        onClick={toggle}
        className={`sound-btn ${on ? '' : 'is-off'}`}
        aria-label={on ? 'Mute sound' : 'Turn sound on'}
        title={on ? 'Sound on' : 'Sound off'}
      >
        <SpeakerIcon size={2.6} muted={!on} />
      </button>
    </div>
  )
}

export default CornerTools
