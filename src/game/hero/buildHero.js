import {
  BackSide,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  OctahedronGeometry,
  PlaneGeometry,
  RedFormat,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'

/**
 * Procedural anime heroes: blocky R6-style proportions (so they sit naturally next
 * to Bloxity avatars) with cel shading, ink outlines, anime eyes, stylised hair and
 * gear. Plain three.js - no React - so the same builder serves the game, the hero
 * hall statues and the portrait renderer.
 *
 * Coordinates: origin at the feet, facing +Z, ~1.8 units tall.
 */

const OUTLINE = new MeshBasicMaterial({ color: '#140f22', side: BackSide })
const OUTLINE_T = 0.022

let gradientMap = null
function toonGradient() {
  if (!gradientMap) {
    gradientMap = new DataTexture(new Uint8Array([110, 185, 255]), 3, 1, RedFormat)
    gradientMap.minFilter = NearestFilter
    gradientMap.magFilter = NearestFilter
    gradientMap.generateMipmaps = false
    gradientMap.needsUpdate = true
  }
  return gradientMap
}

const RAINBOW = 'rainbow'

class HeroKit {
  constructor() {
    this.rainbowMats = []
    this.disposables = []
  }

  toon(color, { vertexColors = false } = {}) {
    const mat = new MeshToonMaterial({
      color: color === RAINBOW ? '#ffffff' : color,
      gradientMap: toonGradient(),
      vertexColors,
    })
    if (color === RAINBOW) this.rainbowMats.push({ mat, scale: 1 })
    this.disposables.push(mat)
    return mat
  }

  glow(color, intensity = 2.2) {
    const mat = new MeshBasicMaterial({
      color: new Color(color === RAINBOW ? '#ffffff' : color).multiplyScalar(intensity),
      toneMapped: false,
    })
    if (color === RAINBOW) this.rainbowMats.push({ mat, scale: intensity })
    this.disposables.push(mat)
    return mat
  }

  flat(color) {
    const mat = new MeshBasicMaterial({ color })
    this.disposables.push(mat)
    return mat
  }

  geo(g) {
    this.disposables.push(g)
    return g
  }

  /** Mesh + optional inverted-hull outline, added to `parent`. */
  add(parent, geometry, material, { pos = [0, 0, 0], rot = [0, 0, 0], outline = true, scale } = {}) {
    const mesh = new Mesh(this.geo(geometry), material)
    mesh.position.set(...pos)
    mesh.rotation.set(...rot)
    if (scale) mesh.scale.set(...scale)
    mesh.castShadow = true
    if (outline) {
      geometry.computeBoundingBox()
      const size = geometry.boundingBox.getSize(new Vector3())
      const o = new Mesh(geometry, OUTLINE)
      o.scale.set(
        (size.x + OUTLINE_T * 2) / Math.max(size.x, 1e-3),
        (size.y + OUTLINE_T * 2) / Math.max(size.y, 1e-3),
        (size.z + OUTLINE_T * 2) / Math.max(size.z, 1e-3),
      )
      mesh.add(o)
    }
    parent.add(mesh)
    return mesh
  }

  box(parent, size, material, opts) {
    return this.add(parent, new BoxGeometry(...size), material, opts)
  }
}

/** Vertical two-colour gradient baked into vertex colours (hair tips). */
function gradientGeometry(geometry, bottom, top, { hdrTop = 1 } = {}) {
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const pos = geometry.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const a = new Color(bottom)
  const b = new Color(top).multiplyScalar(hdrTop)
  const c = new Color()
  for (let i = 0; i < pos.count; i += 1) {
    const t = (pos.getY(i) - min.y) / Math.max(max.y - min.y, 1e-3)
    c.copy(a).lerp(b, t * t)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}

const tipColor = (look, i = 0) =>
  look.hairTip === RAINBOW ? `hsl(${(i * 47) % 360}, 95%, 62%)` : look.hairTip

/* --- Hair ---------------------------------------------------------------------- */

function hairBase(k, head, mat, { back = true, sides = true } = {}) {
  k.box(head, [0.5, 0.16, 0.49], mat, { pos: [0, 0.43, -0.005] })
  if (back) k.box(head, [0.5, 0.36, 0.1], mat, { pos: [0, 0.27, -0.215] })
  if (sides) {
    for (const s of [-1, 1]) k.box(head, [0.05, 0.26, 0.36], mat, { pos: [s * 0.245, 0.3, -0.03] })
  }
}

function bangs(k, head, look, n = 4, len = 0.17) {
  for (let i = 0; i < n; i += 1) {
    const x = -0.17 + (0.34 * i) / (n - 1)
    const g = gradientGeometry(new ConeGeometry(0.075, len, 4), look.hair, look.hair)
    g.rotateX(Math.PI)
    k.add(head, g, k.toon('#ffffff', { vertexColors: true }), {
      pos: [x, 0.36, 0.215],
      rot: [0.25, 0, x * 0.8],
    })
  }
}

function spike(k, head, look, [x, y, z, rx, rz, len], i, hdr = 1) {
  const g = gradientGeometry(new ConeGeometry(0.1, len, 4), look.hair, tipColor(look, i), { hdrTop: hdr })
  g.translate(0, len / 2, 0)
  const mat = hdr > 1 ? k.glow('#ffffff', 1) : k.toon('#ffffff', { vertexColors: true })
  if (hdr > 1) mat.vertexColors = true
  return k.add(head, g, mat, { pos: [x, y, z], rot: [rx, 0, rz], outline: hdr <= 1 })
}

function tail(k, parent, look, { pos, rot, len = 0.85, r0 = 0.11, r1 = 0.04 }) {
  const group = new Group()
  group.position.set(...pos)
  group.rotation.set(...rot)
  const g = gradientGeometry(new CylinderGeometry(r0, r1, len, 6), tipColor(look, 3), look.hair)
  g.translate(0, -len / 2, 0)
  k.add(group, g, k.toon('#ffffff', { vertexColors: true }))
  parent.add(group)
  return group
}

function buildHair(k, head, look, rig) {
  const mat = k.toon(look.hair)
  switch (look.hairStyle) {
    case 'spiky': {
      hairBase(k, head, mat)
      bangs(k, head, look, 4)
      const spikes = [
        [0, 0.48, 0.05, -0.35, 0, 0.36],
        [-0.15, 0.47, 0.02, -0.25, 0.55, 0.32],
        [0.15, 0.47, 0.02, -0.25, -0.55, 0.32],
        [0, 0.47, -0.13, -0.95, 0, 0.36],
        [-0.17, 0.44, -0.13, -0.8, 0.65, 0.3],
        [0.17, 0.44, -0.13, -0.8, -0.65, 0.3],
        [0, 0.36, -0.24, -1.55, 0, 0.3],
        [-0.25, 0.36, -0.02, 0, 1.25, 0.22],
        [0.25, 0.36, -0.02, 0, -1.25, 0.22],
      ]
      spikes.forEach((s, i) => spike(k, head, look, s, i))
      break
    }
    case 'long': {
      hairBase(k, head, mat, { sides: false })
      bangs(k, head, look, 5, 0.15)
      for (const s of [-1, 1]) {
        const g = gradientGeometry(new BoxGeometry(0.07, 0.62, 0.34), tipColor(look), look.hair)
        k.add(head, g, k.toon('#ffffff', { vertexColors: true }), { pos: [s * 0.25, 0.14, -0.02] })
      }
      const back = gradientGeometry(new BoxGeometry(0.52, 0.95, 0.1), tipColor(look), look.hair)
      k.add(head, back, k.toon('#ffffff', { vertexColors: true }), { pos: [0, -0.05, -0.235] })
      spike(k, head, look, [0.02, 0.5, 0.06, 0.6, -0.3, 0.18], 1)
      break
    }
    case 'twintails': {
      hairBase(k, head, mat)
      bangs(k, head, look, 5, 0.14)
      for (const s of [-1, 1]) {
        rig.tails.push(tail(k, head, look, { pos: [s * 0.27, 0.4, -0.06], rot: [0, 0, s * 0.38] }))
        k.add(head, new SphereGeometry(0.065, 10, 8), k.glow(look.topAccent, 1.4), {
          pos: [s * 0.27, 0.4, -0.06],
        })
      }
      break
    }
    case 'hood': {
      const hood = k.toon(look.top)
      k.box(head, [0.6, 0.08, 0.56], hood, { pos: [0, 0.5, -0.01] })
      k.box(head, [0.6, 0.52, 0.08], hood, { pos: [0, 0.25, -0.27] })
      for (const s of [-1, 1]) k.box(head, [0.08, 0.52, 0.54], hood, { pos: [s * 0.29, 0.25, -0.01] })
      k.box(head, [0.6, 0.09, 0.1], k.toon(look.topAccent), { pos: [0, 0.48, 0.25] })
      bangs(k, head, { ...look, hair: look.hairTip }, 3, 0.2)
      break
    }
    case 'topknot': {
      hairBase(k, head, mat)
      k.add(head, new SphereGeometry(0.13, 12, 10), mat, { pos: [0, 0.6, -0.06] })
      k.add(head, new TorusGeometry(0.08, 0.025, 6, 14), k.glow(look.topAccent, 1.4), {
        pos: [0, 0.5, -0.06],
        rot: [Math.PI / 2, 0, 0],
        outline: false,
      })
      for (const s of [-1, 1]) {
        const g = gradientGeometry(new BoxGeometry(0.05, 0.32, 0.05), tipColor(look), look.hair)
        k.add(head, g, k.toon('#ffffff', { vertexColors: true }), { pos: [s * 0.2, 0.26, 0.2] })
      }
      break
    }
    case 'messy': {
      hairBase(k, head, mat)
      bangs(k, head, look, 5, 0.19)
      let s = 11
      const r = () => {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
      }
      for (let i = 0; i < 12; i += 1) {
        const a = r() * Math.PI * 2
        spike(
          k,
          head,
          look,
          [Math.cos(a) * 0.18, 0.4 + r() * 0.08, Math.sin(a) * 0.16 - 0.04, -0.4 - r() * 0.9, (r() - 0.5) * 2.4, 0.18 + r() * 0.14],
          i,
        )
      }
      break
    }
    case 'ponytail': {
      hairBase(k, head, mat)
      bangs(k, head, look, 4, 0.15)
      rig.tails.push(tail(k, head, look, { pos: [0, 0.4, -0.25], rot: [0.35, 0, 0], len: 0.9 }))
      for (const s of [-1, 1]) {
        k.box(head, [0.12, 0.08, 0.04], k.glow(look.topAccent, 1.3), { pos: [s * 0.07, 0.42, -0.28], rot: [0, 0, s * 0.4] })
      }
      break
    }
    case 'slick': {
      k.box(head, [0.5, 0.2, 0.5], mat, { pos: [0, 0.44, -0.01] })
      k.box(head, [0.5, 0.34, 0.1], mat, { pos: [0, 0.27, -0.215] })
      for (let i = 0; i < 5; i += 1) {
        const x = -0.18 + i * 0.09
        spike(k, head, look, [x, 0.46, -0.08, -1.35, 0, 0.34], i)
      }
      spike(k, head, look, [0.12, 0.44, 0.2, 2.6, 0.2, 0.2], 6)
      break
    }
    case 'flame': {
      hairBase(k, head, mat, { sides: false })
      for (let i = 0; i < 13; i += 1) {
        const a = (i / 13) * Math.PI * 2
        const x = Math.cos(a) * 0.17
        const z = Math.sin(a) * 0.15 - 0.03
        spike(k, head, look, [x, 0.45, z, -z * 1.4, -x * 1.6, 0.34 + (i % 3) * 0.1], i, 2.6)
      }
      spike(k, head, look, [0, 0.5, -0.02, -0.1, 0, 0.55], 20, 2.6)
      break
    }
    default:
      hairBase(k, head, mat)
  }
}

/* --- Face ----------------------------------------------------------------------- */

function buildFace(k, head, look) {
  const white = k.flat('#ffffff')
  const dark = k.flat('#1b1426')
  const iris = k.glow(look.eye, 1.8)
  const plane = (w, h) => k.geo(new PlaneGeometry(w, h))
  for (const s of [-1, 1]) {
    const eye = new Group()
    eye.position.set(s * 0.1, 0.205, 0.2225)
    head.add(eye)
    const white1 = new Mesh(plane(0.1, 0.125), white)
    eye.add(white1)
    const ir = new Mesh(plane(0.072, 0.108), iris)
    ir.position.set(s * -0.008, -0.006, 0.001)
    eye.add(ir)
    const pupil = new Mesh(plane(0.032, 0.06), dark)
    pupil.position.set(s * -0.008, -0.01, 0.002)
    eye.add(pupil)
    const hl = new Mesh(plane(0.026, 0.03), white)
    hl.position.set(s * -0.022 + 0.012, 0.024, 0.003)
    eye.add(hl)
    // Upper lash line, thick like anime eyes.
    const lash = new Mesh(plane(0.118, 0.026), dark)
    lash.position.set(0, 0.066, 0.002)
    lash.rotation.z = s * -0.12
    eye.add(lash)
    // Brow, angled for a determined look.
    const brow = new Mesh(plane(0.1, 0.02), k.flat(new Color(look.hair === RAINBOW ? '#555' : look.hair).multiplyScalar(0.55)))
    brow.position.set(s * 0.1, 0.305, 0.2225)
    brow.rotation.z = s * 0.2
    head.add(brow)
  }
  const mouth = new Mesh(plane(0.07, 0.016), dark)
  mouth.position.set(0, 0.105, 0.2225)
  head.add(mouth)
}

/* --- Gear ------------------------------------------------------------------------- */

function buildGear(k, rig, look) {
  const { torso, head, armL, armR, legL, legR } = rig
  const accent = look.topAccent
  const metal = k.toon('#aab3c6')
  for (const item of look.gear || []) {
    switch (item) {
      case 'belt':
        k.box(torso, [0.76, 0.09, 0.42], k.toon('#2a1e18'), { pos: [0, 0.06, 0] })
        k.box(torso, [0.12, 0.08, 0.03], k.glow(accent, 1.6), { pos: [0, 0.06, 0.215], outline: false })
        break
      case 'blades':
        for (const s of [-1, 1]) {
          k.box(torso, [0.13, 0.15, 0.46], metal, { pos: [s * 0.45, 0.1, -0.02] })
          k.box(torso, [0.03, 0.07, 0.9], k.glow(accent, 1.8), {
            pos: [s * 0.48, 0.03, -0.55],
            rot: [0.12, 0, 0],
            outline: false,
          })
        }
        break
      case 'gear':
        k.box(torso, [0.52, 0.24, 0.14], metal, { pos: [0, 0.14, -0.26] })
        for (const s of [-1, 1]) {
          k.add(torso, new CylinderGeometry(0.07, 0.07, 0.5, 8), metal, {
            pos: [s * 0.2, 0.14, -0.36],
            rot: [Math.PI / 2, 0, 0],
          })
        }
        break
      case 'katana': {
        const g = new Group()
        g.position.set(0, 0.38, -0.23)
        g.rotation.z = 0.7
        k.box(g, [0.07, 0.9, 0.05], k.toon('#1a1a22'), { pos: [0, 0, 0] })
        k.box(g, [0.05, 0.26, 0.05], k.toon(accent), { pos: [0, 0.58, 0] })
        k.box(g, [0.16, 0.03, 0.09], k.toon('#e8b12a'), { pos: [0, 0.45, 0] })
        torso.add(g)
        break
      }
      case 'cape': {
        const pivot = new Group()
        pivot.position.set(0, 0.7, -0.21)
        k.box(pivot, [0.76, 1.25, 0.035], k.toon(accent === RAINBOW ? RAINBOW : look.top), {
          pos: [0, -0.62, -0.02],
        })
        k.box(pivot, [0.72, 1.2, 0.02], k.glow(accent, 0.9), { pos: [0, -0.61, 0.01], outline: false })
        torso.add(pivot)
        rig.cape = pivot
        break
      }
      case 'scarf': {
        k.box(torso, [0.52, 0.13, 0.44], k.toon(accent), { pos: [0, 0.7, 0] })
        const pivot = new Group()
        pivot.position.set(0.14, 0.68, -0.22)
        k.box(pivot, [0.14, 0.035, 0.75], k.toon(accent), { pos: [0, 0, -0.37] })
        torso.add(pivot)
        rig.scarf = pivot
        break
      }
      case 'mask':
        k.box(head, [0.48, 0.17, 0.05], k.toon('#1b1726'), { pos: [0, 0.1, 0.215] })
        k.box(head, [0.3, 0.02, 0.01], k.glow(accent, 2), { pos: [0, 0.12, 0.242], outline: false })
        break
      case 'beads':
        for (let i = 0; i < 9; i += 1) {
          const a = Math.PI * (0.15 + (0.7 * i) / 8)
          k.add(torso, new SphereGeometry(0.035, 8, 6), k.toon('#7a3b16'), {
            pos: [Math.cos(a) * 0.24, 0.62 - Math.sin(a) * 0.12, 0.2],
            outline: false,
          })
        }
        break
      case 'halo': {
        const halo = new Mesh(k.geo(new TorusGeometry(0.2, 0.028, 8, 32)), k.glow(accent === RAINBOW ? RAINBOW : look.glow, 3))
        halo.position.set(0, 0.66, -0.02)
        halo.rotation.x = Math.PI / 2 - 0.25
        head.add(halo)
        rig.halo = halo
        break
      }
      case 'shoulders':
        for (const arm of [armL, armR]) {
          k.box(arm, [0.42, 0.15, 0.42], k.toon(accent), { pos: [0, 0.06, 0] })
          k.box(arm, [0.44, 0.03, 0.44], k.glow(look.glow, 2), { pos: [0, -0.02, 0], outline: false })
        }
        break
      case 'wings': {
        const wings = new Group()
        wings.position.set(0, 0.5, -0.22)
        const wingMat = k.glow(look.glow, 1.6)
        wingMat.transparent = true
        wingMat.opacity = 0.75
        for (const s of [-1, 1]) {
          const w = new Group()
          w.rotation.y = s * 0.5
          for (let f = 0; f < 4; f += 1) {
            const len = 0.9 - f * 0.15
            const m = new Mesh(k.geo(new BoxGeometry(len, 0.12, 0.02)), wingMat)
            m.position.set(s * (len / 2 + 0.05), 0.12 - f * 0.13, -0.02)
            m.rotation.z = s * (0.5 - f * 0.28)
            w.add(m)
          }
          wings.add(w)
          rig.wings.push({ group: w, side: s })
        }
        torso.add(wings)
        break
      }
      case 'horns':
        for (const s of [-1, 1]) {
          const g = gradientGeometry(new ConeGeometry(0.055, 0.26, 6), '#241018', look.hairTip)
          g.translate(0, 0.13, 0)
          k.add(head, g, k.toon('#ffffff', { vertexColors: true }), { pos: [s * 0.15, 0.48, 0.06], rot: [-0.2, 0, -s * 0.45] })
        }
        break
      case 'crown':
        k.add(head, new TorusGeometry(0.17, 0.025, 6, 20), k.glow('#ffd23a', 1.4), {
          pos: [0, 0.54, 0],
          rot: [Math.PI / 2, 0, 0],
          outline: false,
        })
        for (let i = 0; i < 5; i += 1) {
          const a = (i / 5) * Math.PI * 2
          k.add(head, new ConeGeometry(0.035, 0.12, 4), k.glow('#ffd23a', 1.6), {
            pos: [Math.cos(a) * 0.17, 0.6, Math.sin(a) * 0.17],
            outline: false,
          })
        }
        break
      case 'headband':
        k.box(head, [0.49, 0.07, 0.47], k.toon(accent), { pos: [0, 0.33, 0] })
        k.box(head, [0.16, 0.06, 0.02], metal, { pos: [0, 0.33, 0.24] })
        for (const s of [-1, 1]) {
          k.box(head, [0.04, 0.02, 0.36], k.toon(accent), { pos: [s * 0.06, 0.3, -0.38], rot: [0.5, s * 0.3, 0] })
        }
        break
      case 'gauntlets':
        for (const arm of [armL, armR]) {
          k.box(arm, [0.36, 0.26, 0.38], k.toon(look.top), { pos: [0, -0.5, 0] })
          k.box(arm, [0.38, 0.035, 0.4], k.glow(look.glow, 2.4), { pos: [0, -0.4, 0], outline: false })
        }
        break
      case 'stars':
        for (const s of [-1, 1]) {
          k.add(head, new OctahedronGeometry(0.06), k.glow('#fff27a', 2.2), {
            pos: [s * 0.26, 0.42, 0.1],
            outline: false,
          })
        }
        break
      case 'cracks': {
        const lava = k.glow(accent, 2.6)
        const lines = [
          [torso, [0.02, 0.4, 0.01], [0.1, 0.35, 0.195], 0.4],
          [torso, [0.02, 0.3, 0.01], [-0.15, 0.45, 0.195], -0.6],
          [torso, [0.25, 0.02, 0.01], [-0.05, 0.25, 0.195], 0.2],
          [armL, [0.02, 0.3, 0.01], [0, -0.3, 0.175], 0.3],
          [armR, [0.02, 0.3, 0.01], [0, -0.3, 0.175], -0.3],
          [legL, [0.02, 0.35, 0.01], [0, -0.3, 0.185], 0.2],
          [legR, [0.02, 0.35, 0.01], [0, -0.3, 0.185], -0.2],
        ]
        for (const [parent, size, pos, rz] of lines) {
          k.box(parent, size, lava, { pos, rot: [0, 0, rz], outline: false })
        }
        break
      }
      default:
        break
    }
  }
}

/* --- Assembly ----------------------------------------------------------------------- */

export function buildHero(def) {
  const look = def.look
  const k = new HeroKit()
  const root = new Group()
  root.name = `hero-${def.id}`
  const body = new Group()
  body.scale.setScalar(0.95)
  root.add(body)

  const hips = new Group()
  hips.position.y = 0.74
  body.add(hips)

  const torso = new Group()
  hips.add(torso)
  const topMat = k.toon(look.top)
  const accentMat = k.toon(look.topAccent)
  const skinMat = k.toon(look.skin)

  k.box(torso, [0.72, 0.72, 0.38], topMat, { pos: [0, 0.36, 0] })
  for (const s of [-1, 1]) {
    k.box(torso, [0.07, 0.72, 0.02], accentMat, { pos: [s * 0.1, 0.36, 0.195], outline: false })
  }
  k.box(torso, [0.42, 0.06, 0.4], accentMat, { pos: [0, 0.71, 0] })
  k.add(torso, new OctahedronGeometry(0.06), k.glow(look.glow, 2.4), { pos: [0, 0.5, 0.21], outline: false })

  const head = new Group()
  head.position.y = 0.72
  torso.add(head)
  k.box(head, [0.46, 0.44, 0.44], skinMat, { pos: [0, 0.23, 0] })

  const makeArm = (s) => {
    const arm = new Group()
    arm.position.set(s * 0.53, 0.66, 0)
    k.box(arm, [0.32, 0.5, 0.34], topMat, { pos: [0, -0.2, 0] })
    k.box(arm, [0.3, 0.22, 0.32], skinMat, { pos: [0, -0.56, 0] })
    torso.add(arm)
    return arm
  }
  const makeLeg = (s) => {
    const leg = new Group()
    leg.position.set(s * 0.18, 0, 0)
    k.box(leg, [0.34, 0.6, 0.36], k.toon(look.pants), { pos: [0, -0.3, 0] })
    k.box(leg, [0.36, 0.16, 0.42], k.toon(look.shoes), { pos: [0, -0.66, 0.03] })
    hips.add(leg)
    return leg
  }

  const rig = {
    root,
    hips,
    torso,
    head,
    armL: makeArm(-1),
    armR: makeArm(1),
    legL: makeLeg(-1),
    legR: makeLeg(1),
    tails: [],
    wings: [],
    cape: null,
    scarf: null,
    halo: null,
    phase: 0,
  }

  // Fist anchors, where held blades go.
  for (const [arm, key] of [[rig.armL, 'handL'], [rig.armR, 'handR']]) {
    const hand = new Group()
    hand.position.set(0, -0.64, 0.05)
    arm.add(hand)
    rig[key] = hand
  }

  buildFace(k, head, look)
  buildHair(k, head, look, rig)
  buildGear(k, rig, look)

  root.traverse((o) => {
    if (o.isMesh && o.material !== OUTLINE) o.castShadow = true
  })

  const hsl = new Color()
  return {
    root,
    rig,
    /** Pose for this frame. motion: { speed, maxSpeed, grounded, grappling, sprint } */
    update(motion, time, delta) {
      animateHero(rig, motion, time, delta)
      for (const { mat, scale } of k.rainbowMats) {
        hsl.setHSL((time * 0.15) % 1, 0.85, 0.6)
        mat.color.copy(hsl).multiplyScalar(scale)
      }
    },
    /** World positions of a shoulder and fist; side -1 = left, +1 = right. */
    arm(side, outShoulder, outHand) {
      const a = side < 0 ? rig.armL : rig.armR
      a.getWorldPosition(outShoulder)
      ;(side < 0 ? rig.handL : rig.handR).getWorldPosition(outHand)
    },
    dispose() {
      k.disposables.forEach((d) => d.dispose())
    },
  }
}

/* --- Animation ----------------------------------------------------------------------- */

function animateHero(rig, motion, time, delta) {
  const { speed = 0, maxSpeed = 6, grounded = true, grappling = false, sprint = false } = motion || {}
  const ratio = Math.min(speed / Math.max(maxSpeed, 0.001), 1)
  const { hips, torso, head, armL, armR, legL, legR } = rig

  for (const g of [torso, head, armL, armR, legL, legR]) g.rotation.set(0, 0, 0)
  hips.position.y = 0.74

  if (grappling) {
    armR.rotation.set(-2.7, 0, 0.25)
    armL.rotation.set(-0.6, 0, -0.5)
    legL.rotation.x = -0.5
    legR.rotation.x = 0.3
    torso.rotation.x = 0.25
  } else if (!grounded) {
    legL.rotation.x = -0.7
    legR.rotation.x = 0.45
    armL.rotation.set(-0.4, 0, -1.0)
    armR.rotation.set(-0.4, 0, 1.0)
    torso.rotation.x = 0.1
  } else if (ratio < 0.05) {
    const idle = Math.sin(time * 1.8)
    armL.rotation.z = -0.07 - idle * 0.03
    armR.rotation.z = 0.07 + idle * 0.03
    hips.position.y = 0.74 + idle * 0.012
    head.rotation.x = idle * 0.03
  } else {
    rig.phase += delta * (6 + ratio * 7)
    const c = Math.sin(rig.phase)
    legL.rotation.x = c * 0.95 * ratio
    legR.rotation.x = -c * 0.95 * ratio
    hips.position.y = 0.74 + Math.abs(Math.cos(rig.phase)) * 0.06 * ratio
    if (sprint) {
      // Anime sprint: lean in, arms swept straight back.
      torso.rotation.x = 0.38
      head.rotation.x = -0.25
      armL.rotation.set(1.25, 0, -0.15)
      armR.rotation.set(1.25, 0, 0.15)
    } else {
      torso.rotation.x = 0.12 * ratio
      armL.rotation.x = -c * 0.8 * ratio
      armR.rotation.x = c * 0.8 * ratio
    }
  }

  const flutter = Math.sin(time * 9) * 0.06
  if (rig.cape) rig.cape.rotation.x = 0.12 + ratio * 0.95 + flutter * (0.4 + ratio) + (grounded ? 0 : 0.5)
  if (rig.scarf) {
    rig.scarf.rotation.x = -0.2 + ratio * 0.2 + Math.sin(time * 7) * 0.1
    rig.scarf.rotation.y = Math.sin(time * 5) * 0.25
  }
  for (const t of rig.tails) t.rotation.x = (t.userData.baseX ??= t.rotation.x) + ratio * 0.9 + flutter
  for (const { group, side } of rig.wings) group.rotation.y = side * (0.45 + Math.sin(time * 3) * 0.25)
  if (rig.halo) rig.halo.position.y = 0.66 + Math.sin(time * 2) * 0.025
}
