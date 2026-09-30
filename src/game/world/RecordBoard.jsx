import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

import { useBloxity } from '../../bloxity/BloxityContext'
import { useNet } from '../../net/net'
import { useProgress } from '../../state/progressStore'
import { formatNumber, formatTime } from '../../utils/format'
import { FONT_BODY } from '../fx/textures'

const W = 512
const H = 768
const ROWS = 8
const RANK_COLORS = ['#ffd43a', '#d9e1f2', '#ff9b5a']

const fmt = (stat, v) => (stat === 'playtime' ? formatTime(Math.floor((v || 0) / 60) * 60) : formatNumber(Math.floor(v || 0)))
const FIELD = { speed: 'bestSpeed', wins: 'totalWins', playtime: 'playtime' }

/**
 * "TOP SPEED / PLAYTIME / WINS" boards: everyone in this lobby, ranked. Solo (or
 * offline) it just lists you. Redrawn into one canvas, never a new texture.
 */
export function RecordBoard({ stat, title, color, position, rotation, scale = 1 }) {
  const { identity } = useBloxity()
  const myName = identity?.displayName || identity?.username || 'You'
  const mine = useProgress((s) => (stat === 'speed' ? s.bestSpeed : stat === 'wins' ? s.totalWins : s.playtime))
  const players = useNet((s) => s.players)
  const selfId = useNet((s) => s.selfId)

  const rows = useMemo(() => {
    const list = [{ name: myName, value: mine, me: true }]
    for (const p of Object.values(players)) {
      if (p.id && p.id !== selfId) list.push({ name: p.name || 'Player', value: p[FIELD[stat]] || 0 })
    }
    return list.sort((a, b) => b.value - a.value).slice(0, ROWS)
  }, [players, selfId, myName, mine, stat])
  // Playtime ticks every second; only redraw when the shown minute changes.
  const key = rows.map((r) => `${r.name}:${fmt(stat, r.value)}`).join('|')

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return { canvas: c, texture: t }
  }, [])
  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(20,18,40,0.93)'
    ctx.beginPath()
    ctx.roundRect(8, 8, W - 16, H - 16, 36)
    ctx.fill()
    ctx.lineWidth = 12
    ctx.strokeStyle = color
    ctx.stroke()

    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.textAlign = 'center'
    ctx.font = `700 62px ${FONT_BODY}`
    ctx.lineWidth = 12
    ctx.strokeStyle = '#120e24'
    ctx.strokeText(title, W / 2, 76)
    ctx.fillStyle = color
    ctx.fillText(title, W / 2, 76)
    ctx.font = `600 30px ${FONT_BODY}`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText('THIS SERVER', W / 2, 132)

    rows.forEach((r, i) => {
      const y = 200 + i * 66
      if (r.me) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.beginPath()
        ctx.roundRect(30, y - 28, W - 60, 56, 14)
        ctx.fill()
      }
      ctx.font = `700 40px ${FONT_BODY}`
      ctx.textAlign = 'left'
      ctx.fillStyle = RANK_COLORS[i] || '#ffffff'
      ctx.fillText(String(i + 1), 46, y)
      ctx.fillStyle = '#ffffff'
      const name = r.name.length > 11 ? `${r.name.slice(0, 10)}…` : r.name
      ctx.fillText(name, 92, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = color
      ctx.fillText(fmt(stat, r.value), W - 44, y)
    })
    texture.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, texture, title, color, key])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 3.6, 0]}>
        <planeGeometry args={[4, 6]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.6, -0.06]}>
        <planeGeometry args={[4.3, 6.3]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

export default RecordBoard
