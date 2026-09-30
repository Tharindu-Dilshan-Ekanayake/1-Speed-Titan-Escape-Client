/**
 * Training treadmills. Stand on one and your character runs in place (AFK friendly),
 * every step multiplied by `mult`. Unlocked by lifetime wins (never spent) and rebirths.
 *
 * `fx` picks the effect stack in game/world/Treadmill.jsx.
 */
export const TREADMILLS = [
  { id: 't1', mult: 1, wins: 0, rebirths: 0, color: '#c9cfe0', fx: 'basic', label: '1X STEPS' },
  { id: 't2', mult: 2, wins: 5, rebirths: 0, color: '#4fe0ff', fx: 'sparkle', label: '2X STEPS' },
  { id: 't4', mult: 4, wins: 25, rebirths: 0, color: '#ff3b2f', fx: 'fire', label: '4X STEPS' },
  { id: 't10', mult: 10, wins: 75, rebirths: 0, color: '#ffd21f', fx: 'electric', label: '10X STEPS' },
  { id: 't25', mult: 25, wins: 200, rebirths: 1, color: '#b84dff', fx: 'void', label: '25X STEPS' },
  { id: 't100', mult: 100, wins: 600, rebirths: 2, color: '#39ff6e', fx: 'toxic', label: '100X STEPS' },
  { id: 't300', mult: 300, wins: 1500, rebirths: 3, color: '#2f6bff', fx: 'plasma', label: '300X STEPS' },
  { id: 't999', mult: 999, wins: 4000, rebirths: 5, color: '#ff8a1f', fx: 'cosmic', label: '999X STEPS' },
]

export const TREADMILL_BY_ID = Object.fromEntries(TREADMILLS.map((t, i) => [t.id, { ...t, index: i }]))

export function treadmillUnlocked(t, progress) {
  return progress.totalWins >= t.wins && progress.rebirths >= t.rebirths
}
