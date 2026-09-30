import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import BloxityProvider from './bloxity/BloxityProvider.jsx'
import { STAGES } from './config/stages'
import { playerState } from './game/playerState'
import './index.css'
import { useProgress } from './state/progressStore'
import { useSession } from './state/sessionStore'
import * as net from './net/net'

// Dev-only console handle for poking at the game (never shipped in a build).
if (import.meta.env.DEV) window.__game = { playerState, useProgress, useSession, STAGES, net }

/**
 * In-world signs are drawn onto canvases with the web fonts, so give the fonts a
 * moment to arrive first (capped - a slow font CDN must never block the game).
 */
const fontsReady = Promise.race([
  Promise.all([
    document.fonts.load('700 64px Fredoka'),
    document.fonts.load('400 64px "Luckiest Guy"'),
  ]).catch(() => null),
  new Promise((resolve) => setTimeout(resolve, 2500)),
])

fontsReady.then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {/* Slug comes from VITE_GAME_SLUG in client/.env — see .env.example. */}
      <BloxityProvider gameSlug={import.meta.env.VITE_GAME_SLUG}>
        <App />
      </BloxityProvider>
    </StrictMode>,
  )
})
