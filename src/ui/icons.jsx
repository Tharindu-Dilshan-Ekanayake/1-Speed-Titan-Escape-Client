import { useId } from 'react'

/**
 * Chunky outlined game icons (64x64 viewBox, ink outline, glossy gradients) in the
 * style of the original's UI. Sized by the `size` prop in em so they scale with the HUD.
 */
const INK = '#1a1330'

function Svg({ size = 3, children, className = '', style }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={`${size}em`}
      height={`${size}em`}
      className={className}
      style={{ overflow: 'visible', ...style }}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {children}
    </svg>
  )
}

function useGrad() {
  return useId().replace(/:/g, '')
}

export function TrophyIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6a8" />
          <stop offset="0.5" stopColor="#ffc21a" />
          <stop offset="1" stopColor="#e07a00" />
        </linearGradient>
      </defs>
      <path d="M14 12h36v4c6 0 10 3 10 9 0 8-8 12-14 12-2 5-6 8-9 9v6h8v8H19v-8h8v-6c-3-1-7-4-9-9-6 0-14-4-14-12 0-6 4-9 10-9z" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
      <path d="M14 22c-3 0-5 1-5 3 0 4 4 6 8 6M50 22c3 0 5 1 5 3 0 4-4 6-8 6" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M22 17c0 8 2 14 6 18" fill="none" stroke="#fffbe0" strokeWidth="3" opacity="0.8" />
    </Svg>
  )
}

export function RebirthIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a8a" />
          <stop offset="1" stopColor="#d4102e" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="44" rx="20" ry="12" fill="#e9f2ff" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="32" cy="41" rx="14" ry="7" fill="#b8d4ff" />
      <path d="M12 30c2-14 16-22 30-17l2-7 10 14-16 5 2-6c-9-3-17 2-19 11z" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
    </Svg>
  )
}

export function AuraIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <radialGradient id={`${id}g`} cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#f0c8ff" />
          <stop offset="0.55" stopColor="#a44dff" />
          <stop offset="1" stopColor="#5a14c9" />
        </radialGradient>
      </defs>
      <path d="M32 4c4 8 14 10 14 20 6-2 8-8 8-8 4 10 2 22-6 30-9 9-23 9-32 0-8-8-9-20-3-29 0 6 4 10 8 11-2-12 7-17 11-24z" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
      <circle cx="32" cy="38" r="10" fill="#2a0a55" stroke={INK} strokeWidth="3" />
      <path d="M46 10l2 4 4 1-4 2-1 4-2-4-4-1 4-2z" fill="#fff" />
    </Svg>
  )
}

export function StoreIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
      </defs>
      <path d="M18 22c0-10 6-15 14-15s14 5 14 15" fill="none" stroke={INK} strokeWidth="7" />
      <path d="M18 22c0-10 6-15 14-15s14 5 14 15" fill="none" stroke="#3aa6ff" strokeWidth="3.5" />
      <path d="M6 22l26-6 26 6-4 32H10z" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
      <path d="M6 22l26 8 26-8" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M32 30v24" stroke={INK} strokeWidth="3" />
      <path d="M12 28l18 5" stroke="#fff3c4" strokeWidth="2.5" opacity="0.8" />
    </Svg>
  )
}

export function GiftIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b07bff" />
          <stop offset="1" stopColor="#5b24d6" />
        </linearGradient>
      </defs>
      <path d="M32 18c-6-10-18-10-16-2 1 4 8 5 16 2zm0 0c6-10 18-10 16-2-1 4-8 5-16 2z" fill="#ffb31a" stroke={INK} strokeWidth="3.5" />
      <rect x="8" y="20" width="48" height="12" rx="3" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
      <rect x="12" y="32" width="40" height="24" rx="3" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
      <rect x="27" y="20" width="10" height="36" fill="#ffc21a" stroke={INK} strokeWidth="3" />
    </Svg>
  )
}

export function TeleportIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <radialGradient id={`${id}g`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#e6f7ff" />
          <stop offset="0.45" stopColor="#4cc3ff" />
          <stop offset="1" stopColor="#1846d6" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="36" rx="26" ry="20" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" transform="rotate(-18 32 36)" />
      <ellipse cx="32" cy="36" rx="13" ry="8" fill="#fff" stroke={INK} strokeWidth="3" transform="rotate(-18 32 36)" />
      <path d="M14 16l3-8 3 8 8 3-8 3-3 8-3-8-8-3z" fill="#fff" stroke={INK} strokeWidth="2.5" />
    </Svg>
  )
}

export function StatsIcon({ size }) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="52" height="52" rx="10" fill="#2e2758" stroke={INK} strokeWidth="3.5" />
      <rect x="14" y="34" width="9" height="16" rx="2" fill="#3bff7a" stroke={INK} strokeWidth="3" />
      <rect x="27.5" y="24" width="9" height="26" rx="2" fill="#39d7ff" stroke={INK} strokeWidth="3" />
      <rect x="41" y="14" width="9" height="36" rx="2" fill="#ffc21a" stroke={INK} strokeWidth="3" />
    </Svg>
  )
}

export function ShoeIcon({ size }) {
  const id = useGrad()
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fe3ff" />
          <stop offset="1" stopColor="#2a8dff" />
        </linearGradient>
      </defs>
      <path d="M8 44c0-10 2-22 8-28 4 4 10 6 14 4 4 8 14 12 22 14 6 2 8 6 8 10v4H8z" fill={`url(#${id}g)`} stroke={INK} strokeWidth="3.5" />
      <path d="M8 44h52v6H8z" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <path d="M24 26l6-3M28 32l6-3M32 38l6-3" stroke="#fff" strokeWidth="3" />
    </Svg>
  )
}

export function PencilIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M8 56l4-16 34-34 12 12-34 34z" fill="#ffc94a" stroke={INK} strokeWidth="3.5" />
      <path d="M40 12l12 12 6-6-12-12z" fill="#ff5f7a" stroke={INK} strokeWidth="3.5" />
      <path d="M8 56l4-16 12 12z" fill="#ffe6c4" stroke={INK} strokeWidth="3" />
      <path d="M8 56l2-7 5 5z" fill={INK} />
    </Svg>
  )
}

export function LockIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M20 28v-8a12 12 0 0124 0v8" fill="none" stroke={INK} strokeWidth="9" />
      <path d="M20 28v-8a12 12 0 0124 0v8" fill="none" stroke="#c9cfe0" strokeWidth="4.5" />
      <rect x="12" y="28" width="40" height="30" rx="6" fill="#ffc21a" stroke={INK} strokeWidth="3.5" />
      <circle cx="32" cy="42" r="4" fill={INK} />
    </Svg>
  )
}

export function HeartIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M32 56S6 40 6 22c0-8 6-14 13-14 6 0 10 3 13 8 3-5 7-8 13-8 7 0 13 6 13 14 0 18-26 34-26 34z" fill="#ff4f6e" stroke={INK} strokeWidth="3.5" />
      <path d="M14 20c0-4 3-6 6-6" fill="none" stroke="#fff" strokeWidth="3.5" />
    </Svg>
  )
}

export function CloseIcon({ size = 1.6 }) {
  return (
    <Svg size={size}>
      <path d="M14 14l36 36M50 14L14 50" stroke={INK} strokeWidth="14" />
      <path d="M14 14l36 36M50 14L14 50" stroke="#fff" strokeWidth="7" />
    </Svg>
  )
}

export function BoltIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M36 4L10 36h16l-6 24 30-34H32z" fill="#ffe14a" stroke={INK} strokeWidth="3.5" />
    </Svg>
  )
}

export function LevelUpIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M32 6l24 22H42v10H22V28H8z" fill="#5dff7a" stroke={INK} strokeWidth="3.5" />
      <path d="M32 28l24 22H42v8H22v-8H8z" fill="#22c24a" stroke={INK} strokeWidth="3.5" />
    </Svg>
  )
}

export function CheckIcon({ size = 1.4 }) {
  return (
    <Svg size={size}>
      <path d="M10 34l14 14 30-32" fill="none" stroke={INK} strokeWidth="13" />
      <path d="M10 34l14 14 30-32" fill="none" stroke="#3bff7a" strokeWidth="6" />
    </Svg>
  )
}

export function CrossIcon({ size = 1.4 }) {
  return (
    <Svg size={size}>
      <path d="M16 16l32 32M48 16L16 48" stroke={INK} strokeWidth="13" />
      <path d="M16 16l32 32M48 16L16 48" stroke="#ff5f6d" strokeWidth="6" />
    </Svg>
  )
}

export function SkullIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M32 6C18 6 8 16 8 30c0 8 4 13 8 16v10h32V46c4-3 8-8 8-16C56 16 46 6 32 6z" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <circle cx="22" cy="30" r="6" fill={INK} />
      <circle cx="42" cy="30" r="6" fill={INK} />
      <path d="M28 44l4-6 4 6z" fill={INK} />
    </Svg>
  )
}

export function SpeakerIcon({ size, muted = false }) {
  return (
    <Svg size={size}>
      <path d="M8 24h11l15-13v42L19 40H8z" fill="#ffe14a" stroke={INK} strokeWidth="3.5" />
      {muted ? (
        <>
          <path d="M42 24l14 16M56 24L42 40" stroke={INK} strokeWidth="10" />
          <path d="M42 24l14 16M56 24L42 40" stroke="#ff5f6d" strokeWidth="5" />
        </>
      ) : (
        <>
          <path d="M42 23c4 4 4 14 0 18" fill="none" stroke={INK} strokeWidth="8" />
          <path d="M42 23c4 4 4 14 0 18" fill="none" stroke="#fff" strokeWidth="3.5" />
          <path d="M49 16c8 8 8 24 0 32" fill="none" stroke={INK} strokeWidth="8" />
          <path d="M49 16c8 8 8 24 0 32" fill="none" stroke="#fff" strokeWidth="3.5" />
        </>
      )}
    </Svg>
  )
}

export function ArrowIcon({ size, dir = 1 }) {
  return (
    <Svg size={size} style={{ transform: dir < 0 ? 'scaleX(-1)' : undefined }}>
      <path d="M14 20h20V8l24 24-24 24V44H14z" fill="#4fd8ff" stroke={INK} strokeWidth="4" />
    </Svg>
  )
}
