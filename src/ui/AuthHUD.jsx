import { useBloxity } from '../bloxity/BloxityContext'
import { useNet } from '../net/net'

/**
 * Identity pill, top-right. Sign-in is automatic on load: a Bloxity session if
 * there is one, otherwise a guest. As a guest the pill is a button that opens the
 * Bloxity login; once signed in it is just a badge (no logout, nothing to click).
 * Progress is saved per identity. The little people count is how many are in this
 * lobby.
 */
function Pill({ as: Tag, children, onClick }) {
  const clickable = Tag === 'button'
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      title={clickable ? 'Log in to Bloxity' : undefined}
      className={`flex items-center gap-[0.5em] rounded-full border-[0.18em] border-[var(--ink)] bg-[#16102c]/70 py-[0.2em] pl-[0.2em] pr-[0.9em] text-left ${
        clickable ? 'cursor-pointer transition-transform hover:scale-105 hover:bg-[#241a4a]/80 active:scale-95' : 'cursor-default'
      }`}
    >
      {children}
    </Tag>
  )
}

export function AuthHUD() {
  const { identity, isLoggedIn, login } = useBloxity()
  const online = useNet((s) => s.status === 'online')
  const count = useNet((s) => Object.keys(s.players).length)

  const name = identity?.displayName || identity?.username || 'Guest'
  const pfp = identity?.pfp

  return (
    <div className="pointer-events-auto absolute right-[1em] top-[0.8em] z-20 flex items-center gap-[0.5em]">
      {online && count > 1 && (
        <span className="ol-sm flex items-center gap-[0.3em] rounded-full border-[0.16em] border-[var(--ink)] bg-[#16102c]/70 px-[0.7em] py-[0.25em] text-[1.05em]">
          <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="#6bff8f" stroke="#1a1330" strokeWidth="2">
            <circle cx="8" cy="8" r="4" />
            <circle cx="17" cy="9" r="3" />
            <path d="M1 21c0-4 3-7 7-7s7 3 7 7zM13 21c0-3 2-6 5-6s5 3 5 6z" />
          </svg>
          {count}/8
        </span>
      )}
      <Pill as={isLoggedIn ? 'div' : 'button'} onClick={isLoggedIn ? undefined : login}>
        {pfp ? (
          <img src={pfp} alt="" className="h-[2.6em] w-[2.6em] rounded-full object-cover ring-2 ring-white/40" />
        ) : (
          <div className="ol-sm flex h-[2.6em] w-[2.6em] items-center justify-center rounded-full bg-[#6d7cff] text-[1.1em]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="leading-tight">
          <div className="ol-sm text-[1.15em]">{name}</div>
          <div className="text-[0.85em] font-semibold text-white/65">{isLoggedIn ? 'Bloxity player' : 'Guest · tap to log in'}</div>
        </div>
      </Pill>
    </div>
  )
}

export default AuthHUD
