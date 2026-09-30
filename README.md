# +1 Speed Titan Escape — Bloxity client

A "+1 Speed" escape obby for Bloxity: every step makes you faster, train on
treadmills, run and grapple through lava stages, and spend Wins on anime heroes.
React + react-three-fiber + Rapier, frontend only for now (progress is saved to
`localStorage`, one slot per Bloxity user / guest).

```bash
cp .env.example .env
npm install
npm run dev            # and run the server (../1-Speed-Titan-Escape-Server: npm run dev)
```

Multiplayer: up to 8 players per lobby through the Colyseus server. Without a
server the game just plays solo (it retries quietly in the background).
`.github/workflows/deploy.yml` builds and uploads the client to Bloxity hosting
(needs the `LEGION_DEPLOY_TOKEN` repo secret).

## Controls

W/S move · A/D turn the camera · Space jump (press again in the air to double jump) · E / Q grapple ·
right-drag camera · scroll zoom. Menu hotkeys: R Rebirth · H Heroes · B Store ·
G Rewards · T Teleport · I Stats · 1-4 Speed packs. Phones get an on-screen stick,
Jump and Grapple. The speaker button (bottom-right) mutes music and effects.


## Game rules (all tunable in `src/config/`)

| What | Where | Rule |
| --- | --- | --- |
| Levels | `progression.js` | Level 1 → 15. Speed per step: +1 at level 1 rising to +10 at level 15 (`STEP_GAIN`). |
| Walkspeed | `progression.js` | Comes only from level: 16 at level 1, +2 per level (44 at 15). Players can set a lower "Custom Speed". |
| Rebirth | `progression.js` | At level 15. Resets level, Speed and walkspeed to level 1; each rebirth adds +25% Wins. |
| Wins | `stages.js` | Win pads at the end of every stage (the pink pad on the bonus island pays double). |
| Daily rewards | `progression.js` | One claim per day on a 7-day streak (`DAILY_REWARDS`); missing a day restarts at day 1. |
| Wins shop | `progression.js` | Speed packs, 2x Steps, 2x Wins, Triple Jump, ∞ Revives — all priced in Wins. No bux. |
| Heroes | `heroes.js` | 12 anime heroes bought with Wins; purely cosmetic (never change speed). Players can always switch back to their Bloxity avatar. |
| Treadmills | `treadmills.js` | x1 → x999 step multipliers, unlocked by lifetime Wins + rebirths. Standing on one runs AFK. |
| Stages | `stages.js` | World 1: 20 stages; World 2: 10 stages. Gaps are sized from the jump physics at each stage's recommended level. |
| World 2 | `progression.js` | Beat W1 stage 20, rebirth once, pay 500 Wins. |

## Layout

- `src/config/` — all numbers and content (levels, heroes, treadmills, stage generator, world layout).
- `src/state/` — `progressStore` (saved), `sessionStore` (HUD / transient), `persistence`.
- `src/game/` — scene, player controller (`Player.jsx`), hero builder + auras (`hero/`), shaders & particles (`fx/`), world pieces (`world/`).
- `src/ui/` — HUD and panels.
- `src/bloxity/` — Bloxity SDK bridge and avatar loading (unchanged starter code).

When the server exists, the saved object is exactly `snapshotProgress()` in
`state/progressStore.js`; win pads, purchases and rebirths are the calls to move
server-side first so they can't be spoofed from the client.

In dev builds `window.__game` exposes the stores for poking at the game from the console.
