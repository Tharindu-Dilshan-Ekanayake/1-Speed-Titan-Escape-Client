import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/**
 * Procedural canvas textures, so the castle / lava look needs no asset downloads.
 * All are tileable and cached; one texture repeat covers TEXTURE_WORLD_SIZE units.
 */
export const TEXTURE_WORLD_SIZE = 4

const cache = new Map()

function canvasTexture(key, size, draw) {
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** Tiny deterministic noise so textures are identical between sessions. */
function rand(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amount))
  const b = Math.min(255, Math.max(0, (n & 255) + amount))
  return `rgb(${r},${g},${b})`
}

/** White/lavender floor tiles - the hall and platform tops. */
export function tileTexture(base = '#eceaf6', line = '#c9c5dc', key = 'tile') {
  return canvasTexture(key, 256, (ctx, s) => {
    const r = rand(7)
    const n = 2
    const t = s / n
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        ctx.fillStyle = shade(base, Math.round((r() - 0.5) * 8))
        ctx.fillRect(x * t, y * t, t, t)
        // Soft bevel.
        const g = ctx.createLinearGradient(x * t, y * t, (x + 1) * t, (y + 1) * t)
        g.addColorStop(0, 'rgba(255,255,255,0.35)')
        g.addColorStop(1, 'rgba(0,0,0,0.05)')
        ctx.fillStyle = g
        ctx.fillRect(x * t, y * t, t, t)
      }
    }
    ctx.strokeStyle = line
    ctx.lineWidth = 5
    for (let i = 0; i <= n; i += 1) {
      ctx.beginPath()
      ctx.moveTo(i * t, 0)
      ctx.lineTo(i * t, s)
      ctx.moveTo(0, i * t)
      ctx.lineTo(s, i * t)
      ctx.stroke()
    }
  })
}

/** Castle wall bricks. */
export function brickTexture(base = '#b9b3cf', mortar = '#8f89a8', key = 'brick') {
  return canvasTexture(key, 256, (ctx, s) => {
    const r = rand(13)
    ctx.fillStyle = mortar
    ctx.fillRect(0, 0, s, s)
    const rows = 8
    const h = s / rows
    for (let y = 0; y < rows; y += 1) {
      const cols = 4
      const w = s / cols
      const off = y % 2 ? w / 2 : 0
      for (let x = -1; x < cols + 1; x += 1) {
        const bx = x * w + off
        ctx.fillStyle = shade(base, Math.round((r() - 0.5) * 22))
        ctx.beginPath()
        ctx.roundRect(bx + 3, y * h + 3, w - 6, h - 6, 5)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(bx + 5, y * h + 5, w - 10, 4)
      }
    }
  })
}

/** Wooden planks (platform sides, walkways). */
export function woodTexture(base = '#a8755a', key = 'wood') {
  return canvasTexture(key, 256, (ctx, s) => {
    const r = rand(29)
    const planks = 4
    const h = s / planks
    for (let i = 0; i < planks; i += 1) {
      ctx.fillStyle = shade(base, Math.round((r() - 0.5) * 26))
      ctx.fillRect(0, i * h, s, h)
      ctx.strokeStyle = 'rgba(60,30,20,0.25)'
      ctx.lineWidth = 2
      for (let g = 0; g < 6; g += 1) {
        const y = i * h + r() * h
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 8, s * 0.6, y + (r() - 0.5) * 8, s, y)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(40,20,10,0.55)'
      ctx.fillRect(0, i * h, s, 4)
    }
  })
}

/** Dark red volcanic rock with cell cracks (the lava pillars). */
export function rockTexture(key = 'rock') {
  return canvasTexture(key, 256, (ctx, s) => {
    const r = rand(41)
    ctx.fillStyle = '#7a1a14'
    ctx.fillRect(0, 0, s, s)
    const pts = Array.from({ length: 26 }, () => [r() * s, r() * s])
    // Cheap voronoi-ish cells: shade each pixel block by its nearest point.
    const step = 4
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        let d1 = Infinity
        let d2 = Infinity
        for (const [px, py] of pts) {
          for (const [ox, oy] of [
            [0, 0],
            [s, 0],
            [-s, 0],
            [0, s],
            [0, -s],
          ]) {
            const d = Math.hypot(x - px - ox, y - py - oy)
            if (d < d1) {
              d2 = d1
              d1 = d
            } else if (d < d2) d2 = d
          }
        }
        const edge = d2 - d1
        const v = edge < 3 ? -60 : Math.round(-d1 * 0.4)
        ctx.fillStyle = shade('#a3281c', v)
        ctx.fillRect(x, y, step, step)
      }
    }
  })
}

export function iceTexture() {
  return tileTexture('#d6f1ff', '#8fc8ea', 'ice')
}

export function iceBrickTexture() {
  return brickTexture('#6f86c9', '#3f4f86', 'icebrick')
}

export function darkStoneTexture() {
  return brickTexture('#4b4f72', '#2c2f48', 'darkstone')
}

/* --- Text ------------------------------------------------------------------------ */

export const FONT_BODY = 'Fredoka, "Segoe UI", sans-serif'
export const FONT_TITLE = '"Luckiest Guy", Fredoka, "Segoe UI", sans-serif'

/**
 * Cartoon text (thick dark outline) on a transparent canvas.
 * Returns { texture, aspect } where aspect = width / height.
 *
 * @param {string} text  may contain \n
 * @param {{ fill?: string|string[], stroke?: string, font?: string, weight?: number,
 *           bg?: string|null, border?: string|null, padding?: number }} opts
 *   `fill` as an array paints a vertical gradient; 'rainbow' paints per-letter hues.
 */
export function textTexture(text, opts = {}) {
  const {
    fill = '#ffffff',
    stroke = '#1a1330',
    font = FONT_BODY,
    weight = 700,
    size = 96,
    bg = null,
    border = null,
    padding = 28,
    radius = 36,
  } = opts
  const key = `txt:${text}:${JSON.stringify(opts)}`
  if (cache.has(key)) return cache.get(key)

  const lines = String(text).split('\n')
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = `${weight} ${size}px ${font}`
  const lineH = size * 1.12
  const width = Math.ceil(Math.max(...lines.map((l) => measure.measureText(l).width)) + padding * 2 + size * 0.2)
  const height = Math.ceil(lines.length * lineH + padding * 2)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (bg) {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(4, 4, width - 8, height - 8, radius)
    ctx.fill()
    if (border) {
      ctx.lineWidth = 8
      ctx.strokeStyle = border
      ctx.stroke()
    }
  }

  ctx.font = `${weight} ${size}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  lines.forEach((line, i) => {
    const y = padding + lineH * (i + 0.5)
    ctx.lineWidth = size * 0.22
    ctx.strokeStyle = stroke
    ctx.strokeText(line, width / 2, y)

    if (fill === 'rainbow') {
      const total = ctx.measureText(line).width
      let x = width / 2 - total / 2
      ctx.textAlign = 'left'
      ;[...line].forEach((ch, j) => {
        ctx.fillStyle = `hsl(${(j * 38) % 360}, 95%, 60%)`
        ctx.fillText(ch, x, y)
        x += ctx.measureText(ch).width
      })
      ctx.textAlign = 'center'
    } else if (Array.isArray(fill)) {
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2)
      fill.forEach((c, k) => g.addColorStop(k / (fill.length - 1), c))
      ctx.fillStyle = g
      ctx.fillText(line, width / 2, y)
    } else {
      ctx.fillStyle = fill
      ctx.fillText(line, width / 2, y)
    }
  })

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  const result = { texture, aspect: width / height }
  cache.set(key, result)
  return result
}

/* --- Biome textures ------------------------------------------------------------------ */

/** Speckled noise ground: base colour with light/dark flecks and soft blotches. */
export function noiseTexture(key, base, { flecks = 900, spread = 30, blotch = 0.25, seed = 3, dark = null } = {}) {
  return canvasTexture(key, 256, (ctx, s) => {
    const r = rand(seed)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 40; i += 1) {
      const x = r() * s
      const y = r() * s
      const rad = 20 + r() * 50
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, shade(base, Math.round((r() - 0.5) * spread)))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = blotch
      ctx.fillStyle = g
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        ctx.beginPath()
        ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    for (let i = 0; i < flecks; i += 1) {
      ctx.fillStyle = dark && r() < 0.4 ? dark : shade(base, Math.round((r() - 0.5) * spread * 1.6))
      ctx.fillRect(r() * s, r() * s, 2 + r() * 3, 2 + r() * 3)
    }
  })
}

export function grassTexture() {
  return canvasTexture('grass', 256, (ctx, s) => {
    const r = rand(17)
    ctx.fillStyle = '#5bc45a'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 1400; i += 1) {
      const x = r() * s
      const y = r() * s
      ctx.strokeStyle = shade('#5bc45a', Math.round((r() - 0.4) * 60))
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (r() - 0.5) * 4, y - 5 - r() * 5)
      ctx.stroke()
    }
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = ['#fff27a', '#ffffff', '#ff8fd8'][i % 3]
      ctx.beginPath()
      ctx.arc(r() * s, r() * s, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

export function barkTexture() {
  return canvasTexture('bark', 256, (ctx, s) => {
    const r = rand(23)
    ctx.fillStyle = '#7a5236'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 70; i += 1) {
      const x = r() * s
      ctx.strokeStyle = shade('#7a5236', Math.round(-20 - r() * 40))
      ctx.lineWidth = 2 + r() * 5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + (r() - 0.5) * 20, s * 0.33, x + (r() - 0.5) * 20, s * 0.66, x, s)
      ctx.stroke()
    }
    for (let i = 0; i < 30; i += 1) {
      ctx.strokeStyle = 'rgba(255,220,180,0.15)'
      ctx.lineWidth = 2
      const x = r() * s
      ctx.beginPath()
      ctx.moveTo(x, r() * s)
      ctx.lineTo(x + (r() - 0.5) * 6, r() * s)
      ctx.stroke()
    }
  })
}

export function roofTileTexture(color = '#c9443a', key = 'rooftile') {
  return canvasTexture(key, 256, (ctx, s) => {
    const r = rand(31)
    ctx.fillStyle = shade(color, -40)
    ctx.fillRect(0, 0, s, s)
    const rows = 8
    const h = s / rows
    for (let y = 0; y < rows; y += 1) {
      const off = y % 2 ? h / 2 : 0
      for (let x = -1; x < rows + 1; x += 1) {
        ctx.fillStyle = shade(color, Math.round((r() - 0.5) * 30))
        ctx.beginPath()
        ctx.ellipse(x * h + off + h / 2, y * h + h * 0.55, h * 0.47, h * 0.55, 0, 0, Math.PI)
        ctx.fill()
      }
    }
  })
}

export function plasterTexture() {
  return canvasTexture('plaster', 256, (ctx, s) => {
    const r = rand(37)
    ctx.fillStyle = '#f2e6cf'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 500; i += 1) {
      ctx.fillStyle = shade('#f2e6cf', Math.round((r() - 0.5) * 24))
      ctx.fillRect(r() * s, r() * s, 3, 3)
    }
    // Timber frame.
    ctx.fillStyle = '#6b4128'
    ctx.fillRect(0, 0, s, 16)
    ctx.fillRect(0, 0, 14, s)
    ctx.save()
    ctx.translate(s / 2, s / 2)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-s * 0.7, -6, s * 1.4, 12)
    ctx.restore()
  })
}

export function metalPlateTexture() {
  return canvasTexture('metalplate', 256, (ctx, s) => {
    const r = rand(41)
    ctx.fillStyle = '#6d7389'
    ctx.fillRect(0, 0, s, s)
    const n = 2
    const t = s / n
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const g = ctx.createLinearGradient(x * t, y * t, (x + 1) * t, (y + 1) * t)
        g.addColorStop(0, '#8a90a8')
        g.addColorStop(1, '#565b70')
        ctx.fillStyle = g
        ctx.fillRect(x * t + 3, y * t + 3, t - 6, t - 6)
        ctx.fillStyle = '#3a3e4f'
        for (const [cx, cy] of [[12, 12], [t - 12, 12], [12, t - 12], [t - 12, t - 12]]) {
          ctx.beginPath()
          ctx.arc(x * t + cx, y * t + cy, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.08})`
      ctx.fillRect(r() * s, r() * s, 30 * r(), 1)
    }
  })
}

export function crystalTileTexture() {
  return canvasTexture('crystaltile', 256, (ctx, s) => {
    const r = rand(47)
    ctx.fillStyle = '#3b2a78'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 26; i += 1) {
      ctx.fillStyle = `hsla(${250 + r() * 70}, 80%, ${45 + r() * 25}%, 0.8)`
      ctx.beginPath()
      const x = r() * s
      const y = r() * s
      ctx.moveTo(x, y)
      for (let k = 0; k < 4; k += 1) ctx.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 80)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(200,180,255,0.9)'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, s - 4, s - 4)
  })
}
