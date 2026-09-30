import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  OctahedronGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
  brickTexture,
  darkStoneTexture,
  iceBrickTexture,
  iceTexture,
  rockTexture,
  TEXTURE_WORLD_SIZE,
  tileTexture,
  woodTexture,
  barkTexture,
  crystalTileTexture,
  grassTexture,
  metalPlateTexture,
  noiseTexture,
  plasterTexture,
  roofTileTexture,
} from './textures'

/* --- Shared GLSL ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }
`

/** Things animated by a shared clock register here; World ticks `uTime` once a frame. */
export const timeUniform = { value: 0 }

/** 'rainbow' is a valid color everywhere: the shader cycles hue instead. */
export function colorUniform(c) {
  return { value: new Color(c === 'rainbow' ? '#ffffff' : c) }
}
export const isRainbow = (c) => c === 'rainbow'

/* --- Surfaces ---------------------------------------------------------------------- */

const surfaceCache = new Map()

/** Lit materials for level geometry, keyed by the `mat` names used in stages.js. */
export function surfaceMaterial(name) {
  if (surfaceCache.has(name)) return surfaceCache.get(name)
  let mat
  if (name.startsWith('glow:')) {
    const [, color, k] = name.split(':')
    mat = glowMaterial(color, Number(k) || 2)
    surfaceCache.set(name, mat)
    return mat
  }
  const std = (opts) => new MeshStandardMaterial({ roughness: 0.9, ...opts })
  switch (name) {
    case 'grass':
      mat = std({ map: grassTexture() })
      break
    case 'dirt':
      mat = std({ map: noiseTexture('dirt', '#8a5a3c', { dark: '#5e3a24' }) })
      break
    case 'sand':
      mat = std({ map: noiseTexture('sand', '#f0cf86', { spread: 24 }) })
      break
    case 'sandstone':
      mat = std({ map: brickTexture('#e8c27a', '#b98f4a', 'sandstone') })
      break
    case 'snow':
      mat = std({ map: noiseTexture('snow', '#f4fbff', { spread: 14 }), roughness: 0.7 })
      break
    case 'snowrock':
      mat = std({ map: noiseTexture('snowrock', '#b9c7dc', { spread: 40, dark: '#8193ad' }) })
      break
    case 'mossrock':
      mat = std({ map: noiseTexture('mossrock', '#6f8a5a', { spread: 50, dark: '#4c6140' }) })
      break
    case 'basalt':
      mat = std({ map: noiseTexture('basalt', '#3d3440', { spread: 30, dark: '#ff5a1f' }), emissive: new Color('#ff3a00'), emissiveIntensity: 0.06 })
      break
    case 'crystalrock':
      mat = std({ map: noiseTexture('crystalrock', '#4a3a86', { spread: 40, dark: '#9b7dff' }), roughness: 0.5 })
      break
    case 'crystaltile':
      mat = std({ map: crystalTileTexture(), roughness: 0.3, emissive: new Color('#5a2dff'), emissiveIntensity: 0.15 })
      break
    case 'moss':
      mat = std({ map: noiseTexture('moss', '#4f8a3a', { spread: 45, dark: '#335e26' }) })
      break
    case 'bark':
      mat = std({ map: barkTexture() })
      break
    case 'leaves':
      mat = std({ map: noiseTexture('leaves', '#3f9b45', { spread: 60, dark: '#2b6e34' }) })
      break
    case 'swampleaves':
      mat = std({ map: noiseTexture('swampleaves', '#5e7a3a', { spread: 50, dark: '#3e5226' }) })
      break
    case 'lily':
      mat = std({ map: noiseTexture('lily', '#4fc25a', { spread: 30 }), roughness: 0.6 })
      break
    case 'cactus':
      mat = std({ map: noiseTexture('cactus', '#3f9a4d', { spread: 30 }) })
      break
    case 'cloud':
      mat = std({ color: '#ffffff', emissive: new Color('#dfefff'), emissiveIntensity: 0.35, roughness: 1 })
      break
    case 'rooftile':
      mat = std({ map: roofTileTexture('#b8563d', 'rooftile') })
      break
    case 'roofred':
      mat = std({ map: roofTileTexture('#d8443a', 'roofred') })
      break
    case 'roofblue':
      mat = std({ map: roofTileTexture('#3a6bff', 'roofblue') })
      break
    case 'plaster':
      mat = std({ map: plasterTexture() })
      break
    case 'window':
      mat = new MeshStandardMaterial({ color: '#2a3550', emissive: new Color('#ffcf6b'), emissiveIntensity: 0.35, roughness: 0.3 })
      break
    case 'metalplate':
      mat = std({ map: metalPlateTexture(), metalness: 0.6, roughness: 0.45 })
      break
    case 'tile':
      mat = new MeshStandardMaterial({ map: tileTexture(), roughness: 0.55 })
      break
    case 'ice':
      mat = new MeshStandardMaterial({ map: iceTexture(), roughness: 0.25, metalness: 0.05 })
      break
    case 'wood':
      mat = new MeshStandardMaterial({ map: woodTexture(), roughness: 0.85 })
      break
    case 'plank':
      mat = new MeshStandardMaterial({ map: woodTexture('#c08a63', 'plank'), roughness: 0.8 })
      break
    case 'beam':
      mat = new MeshStandardMaterial({ map: woodTexture('#8a5a45', 'beam'), roughness: 0.9 })
      break
    case 'brick':
      mat = new MeshStandardMaterial({ map: brickTexture(), roughness: 0.95 })
      break
    case 'icebrick':
      mat = new MeshStandardMaterial({ map: iceBrickTexture(), roughness: 0.6 })
      break
    case 'darkstone':
      mat = new MeshStandardMaterial({ map: darkStoneTexture(), roughness: 0.9 })
      break
    case 'rock':
      mat = new MeshStandardMaterial({
        map: rockTexture(),
        roughness: 0.9,
        emissive: new Color('#ff3300'),
        emissiveIntensity: 0.08,
      })
      break
    case 'stone':
      mat = new MeshStandardMaterial({ map: brickTexture('#b3afc4', '#86829c', 'stone'), roughness: 0.85 })
      break
    case 'castle':
      mat = new MeshStandardMaterial({ map: brickTexture('#dcd8ec', '#aca6c6', 'castle'), roughness: 0.9 })
      break
    case 'darkwood':
      mat = new MeshStandardMaterial({ map: woodTexture('#6a4230', 'darkwood'), roughness: 0.9 })
      break
    case 'iron':
      mat = new MeshStandardMaterial({ color: '#3c4052', metalness: 0.7, roughness: 0.35 })
      break
    case 'steel':
      mat = new MeshStandardMaterial({ color: '#c9d2e6', metalness: 0.9, roughness: 0.22 })
      break
    case 'gold':
      mat = new MeshStandardMaterial({
        color: '#f2b92a',
        metalness: 0.85,
        roughness: 0.28,
        emissive: new Color('#ff9a00'),
        emissiveIntensity: 0.25,
      })
      break
    case 'rope':
      mat = new MeshStandardMaterial({ color: '#c9a36b', roughness: 1 })
      break
    case 'frost':
      mat = new MeshStandardMaterial({
        map: iceTexture(),
        color: '#c4ecff',
        roughness: 0.06,
        metalness: 0.25,
        emissive: new Color('#3fb8ff'),
        emissiveIntensity: 0.18,
      })
      break
    default:
      mat = new MeshStandardMaterial({ color: '#ff00ff' })
  }
  surfaceCache.set(name, mat)
  return mat
}

/** Unlit HDR colour: the value > 1 is what the bloom pass picks up. */
export function glowMaterial(color, intensity = 2.5, opts = {}) {
  const c = new Color(color === 'rainbow' ? '#ffffff' : color).multiplyScalar(intensity)
  return new MeshBasicMaterial({ color: c, toneMapped: false, ...opts })
}

/* --- Box geometry with world-aligned UVs ----------------------------------------- */

/**
 * Merges boxes ({c, s}) into one geometry with UVs projected from world position,
 * so textures line up across neighbouring platforms and never stretch.
 */
export function mergeBoxes(boxes) {
  if (!boxes.length) return null
  const geos = boxes.map(({ c, s }) => {
    const g = new BoxGeometry(s[0], s[1], s[2])
    g.translate(c[0], c[1], c[2])
    const pos = g.getAttribute('position')
    const nrm = g.getAttribute('normal')
    const uv = g.getAttribute('uv')
    const k = 1 / TEXTURE_WORLD_SIZE
    for (let i = 0; i < pos.count; i += 1) {
      const nx = Math.abs(nrm.getX(i))
      const ny = Math.abs(nrm.getY(i))
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      if (ny > 0.5) uv.setXY(i, x * k, z * k)
      else if (nx > 0.5) uv.setXY(i, z * k, y * k)
      else uv.setXY(i, x * k, y * k)
    }
    return g
  })
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged
}

/* --- Lava ------------------------------------------------------------------------ */

export function lavaMaterial(variant = 'fire') {
  const palettes = {
    fire: ['#5a0800', '#ff4a00', '#ffd23a'],
    void: ['#12002a', '#8a2dff', '#5ff8ff'],
    acid: ['#0b2a06', '#3bd62a', '#e8ff5a'],
    molten: ['#4a1400', '#ff8a00', '#fff2a8'],
  }
  const [a, b, c] = palettes[variant]
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uA: { value: new Color(a) },
      uB: { value: new Color(b) },
      uC: { value: new Color(c) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uA, uB, uC;
      varying vec2 vWorld;
      ${NOISE}
      void main() {
        vec2 p = vWorld * 0.18;
        float t = uTime * 0.12;
        vec2 warp = vec2(fbm(p + vec2(t, -t)), fbm(p + vec2(-t * 0.7, t + 3.1)));
        float n = fbm(p * 1.6 + warp * 2.2 + vec2(0.0, t * 1.5));
        float veins = smoothstep(0.55, 0.78, n);
        vec3 col = mix(uA, uB, smoothstep(0.25, 0.6, n));
        col = mix(col, uC * 1.6, veins);
        gl_FragColor = vec4(col * 1.35, 1.0);
      }
    `,
    toneMapped: false,
  })
}

/* --- Treadmill belt -------------------------------------------------------------- */

export function beltMaterial(color) {
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uColor: colorUniform(color),
      uRainbow: { value: isRainbow(color) ? 1 : 0 },
      uActive: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRainbow, uActive;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        // Chevrons scrolling along the belt (u = belt length).
        float u = vUv.x * 6.0 + uTime * 1.6 * uActive;
        float v = abs(vUv.y - 0.5);
        float chev = fract(u + v * 1.4);
        float stripe = smoothstep(0.0, 0.08, chev) * (1.0 - smoothstep(0.32, 0.42, chev));
        vec3 base = vec3(0.09, 0.09, 0.14);
        vec3 glow = uRainbow > 0.5 ? hsv2rgb(vec3(fract(vUv.x + uTime * 0.2), 0.85, 1.0)) : uColor;
        float edge = smoothstep(0.42, 0.5, v);
        vec3 col = base + glow * (stripe * 1.6 * (0.35 + 0.65 * uActive) + edge * 1.2);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  })
}

/* --- Anime "ki" aura shell ---------------------------------------------------------- */

export function auraShellMaterial(color, color2, intensity = 1) {
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uColor: colorUniform(color),
      uColor2: colorUniform(color2),
      uRainbow: { value: isRainbow(color) ? 1 : 0 },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFres;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFres = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRainbow, uIntensity;
      uniform vec3 uColor, uColor2;
      varying vec2 vUv;
      varying float vFres;
      ${NOISE}
      void main() {
        // Flames licking upward, strongest at the silhouette edge.
        vec2 p = vec2(vUv.x * 8.0, vUv.y * 3.0 - uTime * 2.2);
        float f = fbm(p) * 1.4 - vUv.y * 0.9;
        float tongues = smoothstep(0.15, 0.7, f);
        float fade = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
        // Nearly clear through the middle so the hero stays readable; blazes at the rim.
        float a = tongues * fade * (0.05 + pow(vFres, 1.6) * 1.15) * uIntensity;
        vec3 c1 = uRainbow > 0.5 ? hsv2rgb(vec3(fract(vUv.y * 0.6 - uTime * 0.25 + vUv.x), 0.8, 1.0)) : uColor;
        vec3 col = mix(c1, uColor2, smoothstep(0.55, 1.0, f));
        gl_FragColor = vec4(col * 2.2, clamp(a, 0.0, 0.75));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: NormalBlending,
    toneMapped: false,
  })
}

/* --- Ground ring / rune circle ------------------------------------------------------ */

export function groundRingMaterial(color, runes = false) {
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uColor: colorUniform(color),
      uRainbow: { value: isRainbow(color) ? 1 : 0 },
      uRunes: { value: runes ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRainbow, uRunes;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);
        float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
        float outer = smoothstep(0.08, 0.0, abs(r - 0.88)) ;
        float inner = smoothstep(0.05, 0.0, abs(r - 0.62)) * 0.8;
        float dashes = step(0.5, fract(ang * 3.18 + uTime * 0.6)) * smoothstep(0.06, 0.0, abs(r - 0.75));
        float runes = uRunes * step(0.6, fract(ang * 1.9 - uTime * 0.4)) * smoothstep(0.05, 0.0, abs(r - 0.75)) * 1.4;
        float fill = smoothstep(1.0, 0.0, r) * 0.35 * (0.6 + 0.4 * pulse);
        float a = clamp(outer + inner + dashes * 0.9 + runes + fill, 0.0, 1.0) * smoothstep(1.0, 0.92, r);
        vec3 c = uRainbow > 0.5 ? hsv2rgb(vec3(fract(ang / 6.2831 + uTime * 0.15), 0.8, 1.0)) : uColor;
        gl_FragColor = vec4(c * 2.4, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}

/* --- Vertical light pillar / beam ------------------------------------------------ */

export function pillarMaterial(color, strength = 1) {
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uColor: colorUniform(color),
      uRainbow: { value: isRainbow(color) ? 1 : 0 },
      uStrength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFres;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFres = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRainbow, uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vFres;
      ${NOISE}
      void main() {
        float streak = 0.6 + 0.4 * noise(vec2(vUv.x * 20.0, vUv.y * 2.0 - uTime * 3.0));
        float a = (1.0 - vUv.y) * vFres * streak * 0.55 * uStrength;
        vec3 c = uRainbow > 0.5 ? hsv2rgb(vec3(fract(vUv.y - uTime * 0.2), 0.7, 1.0)) : uColor;
        gl_FragColor = vec4(c * 2.0, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}

/* --- Flame sheet (treadmill fire, torches) ------------------------------------------ */

export function flameMaterial(color, color2) {
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uColor: colorUniform(color),
      uColor2: colorUniform(color2),
      uRainbow: { value: isRainbow(color) ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRainbow;
      uniform vec3 uColor, uColor2;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vec2(vUv.x * 6.0, vUv.y * 2.5 - uTime * 2.6);
        float n = fbm(p);
        float shape = n * 1.5 - vUv.y * 1.25;
        float a = smoothstep(0.05, 0.45, shape);
        float core = smoothstep(0.35, 0.8, shape);
        vec3 c1 = uRainbow > 0.5 ? hsv2rgb(vec3(fract(vUv.x * 0.5 + uTime * 0.3), 0.9, 1.0)) : uColor;
        vec3 col = mix(c1, uColor2, core);
        gl_FragColor = vec4(col * 2.4, a * 0.9);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  })
}

/* --- Portal swirl ---------------------------------------------------------------- */

export function portalMaterial(color = '#3fa8ff', color2 = '#ffffff') {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uColor: colorUniform(color), uColor2: colorUniform(color2) },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor, uColor2;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = sin(a * 3.0 + r * 12.0 - uTime * 4.0) * 0.5 + 0.5;
        float n = fbm(vec2(a * 2.0 + uTime * 0.5, r * 4.0 - uTime));
        vec3 col = mix(uColor, uColor2, smoothstep(0.55, 1.0, swirl * n * 1.6 + (1.0 - r) * 0.6));
        float alpha = smoothstep(1.0, 0.85, r);
        gl_FragColor = vec4(col * 1.8, alpha);
      }
    `,
    transparent: true,
    side: DoubleSide,
    toneMapped: false,
  })
}

/* --- Water --------------------------------------------------------------------- */

export function waterMaterial(deep = '#0b4fa8', shallow = '#35c6ff') {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uDeep: { value: new Color(deep) }, uShallow: { value: new Color(shallow) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += sin(w.x * 0.6 + uTime * 1.6) * 0.06 + cos(w.z * 0.5 + uTime * 1.2) * 0.06;
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep, uShallow;
      varying vec2 vUv;
      varying vec3 vWorld;
      ${NOISE}
      void main() {
        vec2 p = vWorld.xz * 0.22;
        float n = fbm(p + vec2(uTime * 0.05, uTime * 0.03));
        float c = pow(abs(sin((fbm(p * 1.7 - uTime * 0.08) + n) * 9.0)), 10.0);
        vec3 col = mix(uDeep, uShallow, 0.3 + 0.45 * n) + c * 0.45;
        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float foam = smoothstep(0.035, 0.0, e - noise(vWorld.xz * 2.0 + uTime) * 0.02);
        col = mix(col, vec3(1.0), foam * 0.85);
        gl_FragColor = vec4(col * 1.1, 0.86 + foam * 0.14);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}

export function waterfallMaterial(color = '#8fe3ff') {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uColor: { value: new Color(color) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float streak = noise(vec2(vUv.x * 22.0, vUv.y * 2.5 + uTime * 3.2));
        streak = smoothstep(0.35, 0.9, streak + noise(vec2(vUv.x * 60.0, vUv.y * 8.0 + uTime * 5.0)) * 0.3);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float foam = smoothstep(0.12, 0.0, vUv.y);
        vec3 col = mix(uColor * 0.8, vec3(1.0), streak * 0.7 + foam);
        gl_FragColor = vec4(col * 1.25, (0.55 + streak * 0.4 + foam * 0.4) * edge);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  })
}

/* --- Stage barrier: see-through hex energy curtain --------------------------------- */

export function barrierMaterial(color, width, height) {
  return new ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uColor: colorUniform(color),
      uPlayer: { value: new Vector3(0, -100, 0) },
      uHit: { value: -100 },
      uHitPos: { value: new Vector2() },
      uSize: { value: new Vector2(width, height) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uHit;
      uniform vec3 uColor, uPlayer;
      uniform vec2 uSize, uHitPos;
      varying vec2 vUv;
      varying vec3 vWorld;
      ${NOISE}
      float hexDist(vec2 p) { p = abs(p); return max(dot(p, normalize(vec2(1.0, 1.732))), p.x); }
      void main() {
        vec2 p = vUv * uSize;
        vec2 g = p / 1.25;
        vec2 r = vec2(1.0, 1.732);
        vec2 h = r * 0.5;
        vec2 a = mod(g, r) - h;
        vec2 b = mod(g - h, r) - h;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        vec2 id = g - gv;
        float edge = smoothstep(0.07, 0.0, 0.5 - hexDist(gv));
        float twinkle = pow(0.5 + 0.5 * sin(uTime * 2.2 + hash(id) * 40.0), 8.0);
        float band = fract(vUv.y * 1.2 - uTime * 0.3);
        float scan = smoothstep(0.0, 0.08, band) * (1.0 - smoothstep(0.08, 0.22, band));
        float flow = noise(vec2(p.x * 0.35, p.y * 0.25 - uTime * 0.9));
        float border = smoothstep(0.04, 0.0, min(vUv.x, 1.0 - vUv.x)) + smoothstep(0.03, 0.0, vUv.y) * 1.5;
        float topFade = 1.0 - smoothstep(0.55, 1.0, vUv.y);
        float dz = abs(uPlayer.z - vWorld.z);
        float dp = length(vec2(vWorld.x - uPlayer.x, vWorld.y - uPlayer.y - 0.9));
        float prox = exp(-dp * 0.55) * (1.0 - smoothstep(0.0, 8.0, dz));
        float age = uTime - uHit;
        float ring = smoothstep(1.4, 0.0, abs(length(p - uHitPos) - age * 16.0)) * exp(-age * 1.3) * step(0.0, age);
        float i = (0.05 + flow * 0.06 + edge * (0.28 + twinkle * 0.7) + scan * 0.22) * topFade
          + border * 0.9 + prox * (0.35 + edge * 1.4) + ring * (0.5 + edge * 1.5);
        // Fade out as the camera passes through, so it never tints the whole screen.
        i *= smoothstep(1.5, 9.0, abs(cameraPosition.z - vWorld.z));
        gl_FragColor = vec4(uColor * i * 2.0, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}

/* --- Torch flame cards (many flames merged into one draw call) -------------------- */

let flameCards = null
export function flameCardMaterial() {
  if (flameCards) return flameCards
  flameCards = new ShaderMaterial({
    uniforms: { uTime: timeUniform },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      varying vec2 vUv;
      varying float vPhase;
      void main() { vUv = uv; vPhase = aPhase; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vPhase;
      ${NOISE}
      void main() {
        float n = fbm(vec2(vUv.x * 3.0 + vPhase * 13.0, vUv.y * 2.2 - uTime * 3.0 - vPhase));
        float width = (1.0 - vUv.y) * 0.5 + 0.08;
        float body = smoothstep(width, width * 0.2, abs(vUv.x - 0.5) + (n - 0.5) * 0.25);
        float shape = body * smoothstep(1.0, 0.25, vUv.y + n * 0.35) * smoothstep(0.0, 0.08, vUv.y);
        vec3 col = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.9, 0.45), smoothstep(0.35, 0.9, shape));
        if (shape < 0.02) discard;
        gl_FragColor = vec4(col * 3.0, shape);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  })
  return flameCards
}

/** Two crossed quads per point, bottom-centred on it. */
export function flameCardGeometry(points, w = 0.9, h = 1.5) {
  const pos = []
  const uv = []
  const phase = []
  const index = []
  points.forEach((pt, i) => {
    for (const [ax, az] of [
      [1, 0],
      [0, 1],
    ]) {
      const base = pos.length / 3
      const hw = w / 2
      pos.push(
        pt[0] - ax * hw, pt[1], pt[2] - az * hw,
        pt[0] + ax * hw, pt[1], pt[2] + az * hw,
        pt[0] + ax * hw, pt[1] + h, pt[2] + az * hw,
        pt[0] - ax * hw, pt[1] + h, pt[2] - az * hw,
      )
      uv.push(0, 0, 1, 0, 1, 1, 0, 1)
      const ph = (i * 0.618) % 1
      phase.push(ph, ph, ph, ph)
      index.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  })
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setAttribute('aPhase', new Float32BufferAttribute(phase, 1))
  g.setIndex(index)
  g.computeBoundingSphere()
  return g
}

/* --- Conveyor belt ------------------------------------------------------------------ */

export function conveyorMaterial(color, tiles, speed) {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uColor: colorUniform(color), uTiles: { value: tiles }, uSpeed: { value: speed } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uTiles, uSpeed;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float v = abs(vUv.y - 0.5);
        float chev = fract(vUv.x * uTiles - uTime * uSpeed - v * 1.3);
        float stripe = smoothstep(0.0, 0.06, chev) * (1.0 - smoothstep(0.3, 0.38, chev));
        float edge = smoothstep(0.43, 0.5, v);
        vec3 col = vec3(0.07, 0.07, 0.11) + uColor * (stripe * 1.5 + edge * 1.3);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  })
}

/* --- Light shaft (god ray): bright at the top, fading toward the floor ------------- */

export function shaftMaterial(color = '#fff1c9', strength = 0.35) {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uColor: colorUniform(color), uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float side = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
        float fall = smoothstep(0.0, 0.7, vUv.y);
        float dust = 0.75 + 0.25 * noise(vec2(vUv.x * 8.0, vUv.y * 5.0 - uTime * 0.4));
        gl_FragColor = vec4(uColor * side * fall * dust * uStrength, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}

/** Scales a geometry's UVs so a tiling texture repeats every TEXTURE_WORLD_SIZE units. */
export function worldUv(geometry, width, height) {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, (uv.getX(i) * width) / TEXTURE_WORLD_SIZE, (uv.getY(i) * height) / TEXTURE_WORLD_SIZE)
  }
  return geometry
}

/* --- Merged primitive shapes (trees, roofs, clouds, crystals...) --------------------- */

function prismGeometry() {
  // Unit triangular prism: ridge along Z, base on y=0, apex at y=1.
  const g = new BufferGeometry()
  const v = [
    -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5,
    -0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, 0.5,
    -0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5, -0.5, 0, 0.5,
    0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5,
  ]
  const uv = [0, 0, 1, 0, 0.5, 1, 0, 0, 0.5, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]
  g.setAttribute('position', new Float32BufferAttribute(v, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()

/**
 * Merges visual primitives into one geometry. Shape:
 *   { type: 'cyl'|'cone'|'sphere'|'oct'|'box'|'prism', c: [x,y,z],
 *     r, h, s: [w,h,d], sy, seg, flip, rx, ry, rz }
 */
export function mergeShapes(shapes) {
  if (!shapes.length) return null
  const geos = shapes.map((sh) => {
    let g
    let sx = 1
    let sy = 1
    let sz = 1
    let uvW = 4
    let uvH = 4
    switch (sh.type) {
      case 'cyl':
        g = new CylinderGeometry(sh.r2 ?? sh.r, sh.r, sh.h, sh.seg || 12)
        uvW = Math.PI * 2 * sh.r
        uvH = sh.h
        break
      case 'cone':
        g = new ConeGeometry(sh.r, sh.h, sh.seg || 12)
        if (sh.flip) g.rotateX(Math.PI)
        uvW = Math.PI * 2 * sh.r
        uvH = sh.h
        break
      case 'sphere':
        g = new SphereGeometry(sh.r, 14, 10)
        sy = sh.sy ?? 1
        uvW = Math.PI * 2 * sh.r
        uvH = Math.PI * sh.r
        break
      case 'oct':
        g = new OctahedronGeometry(sh.r, 0)
        sy = sh.sy ?? 1
        break
      case 'prism':
        g = prismGeometry()
        ;[sx, sy, sz] = sh.s
        uvW = Math.max(sx, sz)
        uvH = sy
        break
      default:
        g = new BoxGeometry(...sh.s)
        uvW = Math.max(sh.s[0], sh.s[2])
        uvH = sh.s[1]
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, (uv.getX(i) * uvW) / TEXTURE_WORLD_SIZE, (uv.getY(i) * uvH) / TEXTURE_WORLD_SIZE)
    }
    _q.setFromEuler(_e.set(sh.rx || 0, sh.ry || 0, sh.rz || 0))
    _m.compose(_p.set(...sh.c), _q, _s.set(sx, sy, sz))
    g.applyMatrix4(_m)
    // mergeGeometries needs identical attribute sets.
    return g.index ? g.toNonIndexed() : g
  })
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged
}

/* --- Sea of clouds under void stages ------------------------------------------------ */

/**
 * Drifting ground mist over a deep drop (forest / city): thick enough that the
 * gaps read as a fall, thin enough to glimpse the titans walking through it.
 */
export function mistMaterial(color = '#e6f5ec') {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uColor: { value: new Color(color) } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vWorld;
      ${NOISE}
      void main() {
        vec2 p = vWorld.xz * 0.06;
        float n = fbm(p + vec2(uTime * 0.03, uTime * 0.05)) + fbm(p * 2.1 - uTime * 0.04) * 0.5;
        float a = mix(0.62, 0.92, smoothstep(0.3, 0.95, n));
        gl_FragColor = vec4(uColor * mix(0.86, 1.05, n), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
  })
}

export function cloudSeaMaterial(top = '#ffffff', deep = '#9fc9ff') {
  return new ShaderMaterial({
    uniforms: { uTime: timeUniform, uTop: { value: new Color(top) }, uDeep: { value: new Color(deep) } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uTop, uDeep;
      varying vec3 vWorld;
      ${NOISE}
      void main() {
        vec2 p = vWorld.xz * 0.035;
        float n = fbm(p + vec2(uTime * 0.01, uTime * 0.02));
        float puff = smoothstep(0.35, 0.8, n + fbm(p * 2.3 - uTime * 0.015) * 0.4);
        gl_FragColor = vec4(mix(uDeep, uTop, puff), 1.0);
      }
    `,
    fog: false,
  })
}
