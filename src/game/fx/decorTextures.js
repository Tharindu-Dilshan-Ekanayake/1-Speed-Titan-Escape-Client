import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

import { FONT_TITLE } from './textures'

/**
 * Hand-painted canvas art for the set dressing: banners, stained glass, titan
 * faces, carpet, hazard stripes. Drawn once and cached.
 */
const cache = new Map()

function paint(key, w, h, draw, { repeat = false } = {}) {
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d'), w, h)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) {
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
  }
  cache.set(key, tex)
  return tex
}

const INK = '#1a1330'

/** A winged running shoe - the game's crest. */
function crest(ctx, cx, cy, s, main, trim) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.lineJoin = 'round'
  ctx.lineWidth = 7
  ctx.strokeStyle = INK
  // Wings
  for (const dir of [-1, 1]) {
    ctx.save()
    ctx.scale(dir, 1)
    ctx.beginPath()
    ctx.moveTo(18, -6)
    ctx.bezierCurveTo(60, -52, 92, -40, 96, -30)
    ctx.bezierCurveTo(80, -24, 84, -12, 70, -8)
    ctx.bezierCurveTo(78, 0, 66, 10, 54, 8)
    ctx.bezierCurveTo(50, 18, 34, 18, 18, 12)
    ctx.closePath()
    ctx.fillStyle = trim
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
  // Shield
  ctx.beginPath()
  ctx.moveTo(0, -46)
  ctx.lineTo(40, -32)
  ctx.lineTo(36, 18)
  ctx.quadraticCurveTo(24, 44, 0, 56)
  ctx.quadraticCurveTo(-24, 44, -36, 18)
  ctx.lineTo(-40, -32)
  ctx.closePath()
  ctx.fillStyle = main
  ctx.fill()
  ctx.stroke()
  ctx.font = `64px ${FONT_TITLE}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 10
  ctx.strokeText('+1', 0, 6)
  ctx.fillStyle = trim
  ctx.fillText('+1', 0, 6)
  ctx.restore()
}

/** Hanging banner with a V-cut tail. `theme`: 'fire' | 'ice' | 'royal'. */
export function bannerTexture(theme = 'fire') {
  const palettes = {
    fire: ['#b3122b', '#e8263f', '#ffc21a'],
    ice: ['#1a3f9e', '#3a7bff', '#bfe9ff'],
    royal: ['#4a1a9e', '#7b3dff', '#ffd23a'],
  }
  const [dark, light, trim] = palettes[theme]
  return paint(`banner:${theme}`, 256, 640, (ctx, w, h) => {
    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.lineTo(w - 8, 0)
    ctx.lineTo(w - 8, h - 70)
    ctx.lineTo(w / 2, h - 8)
    ctx.lineTo(8, h - 70)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, w, 0)
    g.addColorStop(0, dark)
    g.addColorStop(0.5, light)
    g.addColorStop(1, dark)
    ctx.fillStyle = g
    ctx.fill()
    ctx.lineWidth = 16
    ctx.strokeStyle = trim
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.strokeStyle = INK
    ctx.stroke()
    // Fabric folds.
    for (let x = 40; x < w; x += 58) {
      const f = ctx.createLinearGradient(x - 14, 0, x + 14, 0)
      f.addColorStop(0, 'rgba(0,0,0,0)')
      f.addColorStop(0.5, 'rgba(0,0,0,0.18)')
      f.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = f
      ctx.fillRect(x - 14, 14, 28, h - 110)
    }
    crest(ctx, w / 2, 250, 1.05, dark, trim)
    ctx.fillStyle = trim
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath()
      ctx.arc(w / 2 + (i - 1) * 46, 420, 10, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

/** Arched stained-glass window; transparent outside the arch. */
export function stainedGlassTexture(seed = 1) {
  return paint(`glass:${seed}`, 256, 512, (ctx, w, h) => {
    let s = seed * 9301 + 49297
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    const arch = () => {
      ctx.beginPath()
      ctx.moveTo(10, h - 6)
      ctx.lineTo(10, w / 2)
      ctx.arc(w / 2, w / 2, w / 2 - 10, Math.PI, 0)
      ctx.lineTo(w - 10, h - 6)
      ctx.closePath()
    }
    ctx.save()
    arch()
    ctx.clip()
    const hues = [200, 280, 330, 45, 160, 20]
    const cell = 36
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const hue = hues[Math.floor(rnd() * hues.length)] + rnd() * 20
        ctx.fillStyle = `hsl(${hue}, 85%, ${45 + rnd() * 20}%)`
        ctx.beginPath()
        ctx.moveTo(x + rnd() * 8, y + rnd() * 8)
        ctx.lineTo(x + cell + rnd() * 8, y + rnd() * 8)
        ctx.lineTo(x + cell + rnd() * 8, y + cell + rnd() * 8)
        ctx.lineTo(x + rnd() * 8, y + cell + rnd() * 8)
        ctx.fill()
      }
    }
    // Lead came.
    ctx.strokeStyle = '#1b1426'
    ctx.lineWidth = 5
    for (let y = 0; y < h; y += cell) {
      ctx.beginPath()
      ctx.moveTo(0, y + rnd() * 8)
      ctx.lineTo(w, y + rnd() * 8)
      ctx.stroke()
    }
    for (let x = 0; x < w; x += cell) {
      ctx.beginPath()
      ctx.moveTo(x + rnd() * 8, 0)
      ctx.lineTo(x + rnd() * 8, h)
      ctx.stroke()
    }
    // Rose in the arch + crest in the middle.
    ctx.fillStyle = 'rgba(255,240,180,0.9)'
    ctx.beginPath()
    ctx.arc(w / 2, w / 2, 46, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2
      ctx.fillStyle = i % 2 ? '#ff4fb8' : '#39d7ff'
      ctx.beginPath()
      ctx.ellipse(w / 2 + Math.cos(a) * 30, w / 2 + Math.sin(a) * 30, 14, 8, a, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    crest(ctx, w / 2, h * 0.62, 0.95, '#b3122b', '#ffd23a')
    ctx.restore()
    arch()
    ctx.lineWidth = 14
    ctx.strokeStyle = '#2a2138'
    ctx.stroke()
  })
}

/** Titan face. 'smiling' (the classic grin), 'colossal' (no skin) or 'frost'. */
export function titanFaceTexture(variant) {
  return paint(`titan:${variant}`, 512, 512, (ctx, w, h) => {
    const skin = { smiling: '#e9a98c', colossal: '#b8302c', frost: '#9dbbe0' }[variant]
    ctx.fillStyle = skin
    ctx.fillRect(0, 0, w, h)
    if (variant === 'colossal') {
      // Exposed muscle fibres.
      ctx.strokeStyle = 'rgba(255,170,150,0.55)'
      ctx.lineWidth = 6
      for (let i = 0; i < 40; i += 1) {
        const x = (i / 40) * w
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + 30, h * 0.3, x - 30, h * 0.6, x + 10, h)
        ctx.stroke()
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, w, 40)
    // Brows.
    ctx.fillStyle = variant === 'colossal' ? '#6b1010' : '#3a2418'
    for (const dir of [-1, 1]) {
      ctx.save()
      ctx.translate(w / 2 + dir * 120, 150)
      ctx.rotate(dir * 0.22)
      ctx.fillRect(-80, -14, 160, 28)
      ctx.restore()
    }
    // Eye sockets (the glowing eyes are separate meshes).
    ctx.fillStyle = '#1a0d0a'
    for (const dir of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(w / 2 + dir * 118, 215, 68, 46, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // Nose.
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.moveTo(w / 2, 240)
    ctx.lineTo(w / 2 - 34, 320)
    ctx.lineTo(w / 2 + 34, 320)
    ctx.fill()
    // The grin.
    ctx.fillStyle = '#240808'
    ctx.beginPath()
    ctx.moveTo(60, 350)
    ctx.quadraticCurveTo(w / 2, 520, w - 60, 350)
    ctx.quadraticCurveTo(w / 2, 420, 60, 350)
    ctx.fill()
    ctx.fillStyle = '#f7f0e0'
    for (let i = 0; i < 14; i += 1) {
      const t = (i + 0.5) / 14
      const x = 70 + t * (w - 140)
      const y = 350 + Math.sin(t * Math.PI) * 42
      ctx.fillRect(x - 12, y - 4, 24, 30)
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 5
    for (const dir of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(w / 2 + dir * 150, 300)
      ctx.quadraticCurveTo(w / 2 + dir * 200, 360, w / 2 + dir * 190, 420)
      ctx.stroke()
    }
  })
}

/** Red carpet with gold edging, tiled along its length. */
export function carpetTexture() {
  return paint(
    'carpet',
    128,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#b3122b'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#d8203a'
      ctx.fillRect(16, 0, w - 32, h)
      ctx.fillStyle = '#ffc21a'
      ctx.fillRect(8, 0, 6, h)
      ctx.fillRect(w - 14, 0, 6, h)
      ctx.fillStyle = 'rgba(255,210,60,0.55)'
      for (let y = 32; y < h; y += 64) {
        ctx.beginPath()
        ctx.moveTo(w / 2, y - 18)
        ctx.lineTo(w / 2 + 18, y)
        ctx.lineTo(w / 2, y + 18)
        ctx.lineTo(w / 2 - 18, y)
        ctx.fill()
      }
    },
    { repeat: true },
  )
}

/** Red/white hazard stripes for sweeper bars. */
export function hazardStripeTexture() {
  return paint(
    'hazard',
    256,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#f4f1f8'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#e8263f'
      for (let x = -h; x < w + h; x += 48) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 24, 0)
        ctx.lineTo(x + 24 + h, h)
        ctx.lineTo(x + h, h)
        ctx.fill()
      }
    },
    { repeat: true },
  )
}
