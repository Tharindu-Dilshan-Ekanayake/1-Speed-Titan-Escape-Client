import { useState } from 'react'

/** Control hints, bottom-left; click to collapse. */
export function Controls() {
  const [open, setOpen] = useState(true)
  const rows = [
    ['W S', 'Move'],
    ['A D', 'Turn camera'],
    ['Space', 'Jump'],
    ['Space x2', 'Double Jump'],
    ['E / Q', 'Grapple'],
    ['Right-drag', 'Camera'],
    ['Scroll', 'Zoom'],
  ]

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="pointer-events-auto absolute bottom-[1em] left-[1em] rounded-[0.8em] border-[0.16em] border-[var(--ink)] bg-[#16102c]/60 px-[0.8em] py-[0.4em] text-left"
    >
      {open ? (
        rows.map(([key, action]) => (
          <div key={key} className="text-[1em] leading-snug">
            <span className="ol-sm text-[#ffe45c]">{key}</span> <span className="font-semibold text-white/85">{action}</span>
          </div>
        ))
      ) : (
        <span className="ol-sm text-[1.1em]">? Controls</span>
      )}
    </button>
  )
}

export default Controls
