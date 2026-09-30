import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
} from 'three'

/**
 * Procedural blades. The grip sits at the origin and the blade runs up local +Y,
 * so the holder only has to point +Y where the blade should go.
 *
 * Every blade gets a glowing halo shell (additive, HDR - the bloom pass turns it
 * into a soft glow) and an emissive core, so it reads from across the stage.
 */

function bladeShape(kind, w, len) {
  const s = new Shape()
  switch (kind) {
    case 'katana': {
      // Slight curve, clipped tip.
      s.moveTo(-w / 2, 0)
      s.quadraticCurveTo(-w / 2 - w * 0.35, len * 0.55, -w * 0.1, len)
      s.lineTo(w * 0.5, len * 0.93)
      s.quadraticCurveTo(w / 2 - w * 0.25, len * 0.5, w / 2, 0)
      break
    }
    case 'cleaver':
      s.moveTo(-w / 2, 0)
      s.lineTo(-w / 2, len * 0.92)
      s.lineTo(-w * 0.1, len)
      s.lineTo(w / 2, len)
      s.lineTo(w / 2, 0)
      break
    case 'greatsword':
      s.moveTo(-w / 2, 0)
      s.lineTo(-w / 2, len * 0.82)
      s.lineTo(0, len)
      s.lineTo(w / 2, len * 0.82)
      s.lineTo(w / 2, 0)
      break
    default:
      // Scout blade: long and straight with the angled, snapped-off tip.
      s.moveTo(-w / 2, 0)
      s.lineTo(-w / 2, len)
      s.lineTo(w / 2, len * 0.86)
      s.lineTo(w / 2, 0)
  }
  s.closePath()
  return s
}

function axeHead(kind, size) {
  const s = new Shape()
  if (kind === 'scythe') {
    // Long curved blade sweeping out and down from the top of the haft.
    s.moveTo(0, 0)
    s.quadraticCurveTo(0.55 * size, 0.28 * size, 1.05 * size, -0.22 * size)
    s.quadraticCurveTo(0.6 * size, 0.02 * size, 0, -0.16 * size)
  } else {
    // Double-bitted war axe head.
    s.moveTo(0, 0.18 * size)
    s.quadraticCurveTo(0.35 * size, 0.42 * size, 0.52 * size, 0.46 * size)
    s.quadraticCurveTo(0.44 * size, 0, 0.52 * size, -0.46 * size)
    s.quadraticCurveTo(0.35 * size, -0.42 * size, 0, -0.18 * size)
    s.lineTo(-0.3 * size, -0.28 * size)
    s.quadraticCurveTo(-0.24 * size, 0, -0.3 * size, 0.28 * size)
  }
  s.closePath()
  return s
}

const EXTRUDE = { depth: 0.04, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 10 }

export function buildWeapon(spec) {
  const size = spec.size || 1
  const rainbow = spec.glow === 'rainbow'
  const glowColor = new Color(rainbow ? '#ffffff' : spec.glow)
  const disposables = []
  const track = (x) => {
    disposables.push(x)
    return x
  }

  const bladeMat = track(
    new MeshStandardMaterial({
      color: spec.blade,
      metalness: 0.85,
      roughness: 0.18,
      emissive: glowColor.clone(),
      emissiveIntensity: 0.55,
    }),
  )
  const haloMat = track(
    new MeshBasicMaterial({
      color: glowColor.clone().multiplyScalar(2.2),
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  const gripMat = track(new MeshStandardMaterial({ color: '#1f1a2e', roughness: 0.8 }))
  const goldMat = track(new MeshStandardMaterial({ color: '#f2b92a', metalness: 0.9, roughness: 0.25 }))

  const root = new Group()
  const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const m = new Mesh(track(geo), mat)
    m.position.set(...pos)
    m.rotation.set(...rot)
    if (scale) m.scale.set(...scale)
    m.castShadow = mat !== haloMat
    root.add(m)
    return m
  }

  const polearm = spec.shape === 'axe' || spec.shape === 'scythe'
  if (polearm) {
    const haft = 1.25 * size
    add(new CylinderGeometry(0.045, 0.055, haft, 8), gripMat, [0, haft / 2 - 0.2, 0])
    add(new TorusGeometry(0.06, 0.02, 6, 12), goldMat, [0, 0, 0], [Math.PI / 2, 0, 0])
    const head = new ExtrudeGeometry(axeHead(spec.shape, size), EXTRUDE)
    head.translate(0, 0, -0.02)
    const top = haft - 0.35
    add(head, bladeMat, [0.02, top, 0])
    add(head.clone(), haloMat, [0.02, top, 0], [0, 0, 0], [1.12, 1.12, 2.4])
    add(new BoxGeometry(0.12, 0.16, 0.12), goldMat, [0, top, 0])
  } else {
    const wide = { blade: 0.15, katana: 0.12, cleaver: 0.32, greatsword: 0.28 }[spec.shape] || 0.15
    const len = { blade: 1.05, katana: 1.2, cleaver: 0.8, greatsword: 1.35 }[spec.shape] || 1.05
    const w = wide * size
    const l = len * size
    add(new CylinderGeometry(0.04, 0.045, 0.3, 8), gripMat, [0, -0.08, 0])
    add(new BoxGeometry(w + 0.16, 0.06, 0.14), goldMat, [0, 0.09, 0])
    const blade = new ExtrudeGeometry(bladeShape(spec.shape, w, l), EXTRUDE)
    blade.translate(0, 0.12, -0.02)
    add(blade, bladeMat)
    // Halo: the same blade, fattened, additive - the bloom does the rest.
    const halo = add(blade.clone(), haloMat, [0, 0, 0], [0, 0, 0], [1.18, 1.03, 2.6])
    halo.position.y = -0.02
    if (spec.shape === 'blade') {
      // ODM-style blade case clamp.
      add(new BoxGeometry(0.1, 0.22, 0.1), gripMat, [0, -0.3, 0])
    }
  }

  const hsl = new Color()
  return {
    root,
    /** Length along +Y, for placing particles. */
    length: (polearm ? 1.2 : 1.1) * size,
    update(time) {
      if (rainbow) {
        hsl.setHSL((time * 0.25) % 1, 0.9, 0.6)
        haloMat.color.copy(hsl).multiplyScalar(2.4)
        bladeMat.emissive.copy(hsl)
      }
      haloMat.opacity = 0.45 + Math.sin(time * 4) * 0.12
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
