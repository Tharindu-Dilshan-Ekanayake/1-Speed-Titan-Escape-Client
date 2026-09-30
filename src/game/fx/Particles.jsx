import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, NormalBlending, ShaderMaterial } from 'three'

import { timeUniform } from './materials'

/**
 * GPU particles: every position is computed in the vertex shader from a per-particle
 * random seed and the shared clock, so an aura costs no CPU per frame.
 *
 * pattern: rise | orbit | spiral | fall | sparkle | line
 * shape:   dot | ember | petal | star | shard | leaf | streak
 *
 * Positions are local to the parent (origin at the feet). `line` spreads particles
 * along local X over `length`, for treadmill belts.
 */
const PATTERNS = ['rise', 'orbit', 'spiral', 'fall', 'sparkle', 'line']
const SHAPES = ['dot', 'ember', 'petal', 'star', 'shard', 'leaf', 'streak']

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime, uSpeed, uSize, uRadius, uHeight, uLength, uPx;
  varying float vAlpha;
  varying float vMix;
  varying float vSpin;
  varying float vHue;
  const float TAU = 6.2831853;
  void main() {
    float t = uTime * uSpeed;
    vec3 p;
    float alpha = 1.0;
    float size = uSize;
    float life = 0.0;
    #if PATTERN == 0
      life = fract(aSeed.x + t * 0.5);
      float a = aSeed.y * TAU + t * 0.4;
      float r = uRadius * (0.35 + 0.65 * aSeed.z) * (1.0 - life * 0.35);
      p = vec3(cos(a) * r, life * uHeight, sin(a) * r);
      p.x += sin(uTime * 3.0 + aSeed.w * 20.0) * 0.07;
      alpha = sin(life * 3.14159);
      size *= 1.25 - life * 0.8;
    #elif PATTERN == 1
      life = aSeed.z;
      float a = aSeed.y * TAU + t * (0.6 + aSeed.z * 0.8) * (aSeed.w > 0.5 ? 1.0 : -1.0);
      float r = uRadius * (0.95 + 0.3 * aSeed.z);
      p = vec3(cos(a) * r, uHeight * (0.2 + 0.6 * aSeed.x) + sin(uTime * 2.0 + aSeed.w * 6.0) * 0.18, sin(a) * r);
    #elif PATTERN == 2
      life = fract(aSeed.x + t * 0.35);
      float a = aSeed.y * TAU + life * 9.0 + t;
      float r = uRadius * (0.55 + 0.45 * aSeed.z) * (1.0 - 0.35 * life);
      p = vec3(cos(a) * r, life * uHeight * 1.1, sin(a) * r);
      alpha = sin(life * 3.14159);
    #elif PATTERN == 3
      life = fract(aSeed.x + t * 0.22);
      float a = aSeed.y * TAU + uTime * 0.3;
      float r = uRadius * (0.5 + 1.3 * aSeed.z);
      p = vec3(cos(a) * r + sin(uTime * 2.0 + aSeed.w * 6.0) * 0.25, uHeight * 1.35 * (1.0 - life), sin(a) * r);
      alpha = sin(life * 3.14159);
    #elif PATTERN == 4
      life = aSeed.z;
      float a = aSeed.y * TAU;
      float r = uRadius * (0.4 + 0.9 * aSeed.z);
      p = vec3(cos(a) * r, uHeight * aSeed.x, sin(a) * r);
      float tw = pow(max(0.0, sin(t * 3.0 + aSeed.w * 40.0)), 5.0);
      alpha = tw;
      size *= 0.4 + tw;
    #else
      life = fract(aSeed.x + t * 0.5);
      p = vec3((aSeed.y - 0.5) * uLength, life * uHeight, (aSeed.z - 0.5) * uRadius * 2.0);
      alpha = sin(life * 3.14159);
      size *= 1.2 - life * 0.7;
    #endif
    vAlpha = alpha;
    vMix = life;
    vSpin = aSeed.w * TAU + uTime * (aSeed.x - 0.5) * 3.0;
    vHue = fract(aSeed.y + uTime * 0.15 + life * 0.3);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * uPx / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA, uColorB;
  uniform float uRainbow, uIntensity;
  varying float vAlpha;
  varying float vMix;
  varying float vSpin;
  varying float vHue;
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float cs = cos(vSpin), sn = sin(vSpin);
    vec2 q = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
    float d = length(p);
    float a;
    #if SHAPE == 0
      a = smoothstep(0.5, 0.0, d);
      a = a * a * 1.4;
    #elif SHAPE == 1
      a = smoothstep(0.5, 0.05, d);
      a = pow(a, 1.6) * 1.5;
    #elif SHAPE == 2
      float e = length(vec2(q.x * 2.2, q.y * 1.15 + abs(q.x) * 0.6));
      a = smoothstep(0.5, 0.42, e);
    #elif SHAPE == 3
      float star = max(0.0, 1.0 - abs(q.x * q.y) * 90.0) * smoothstep(0.5, 0.1, d);
      a = clamp(star + smoothstep(0.22, 0.0, d), 0.0, 1.0);
    #elif SHAPE == 4
      float dia = abs(q.x) * 1.9 + abs(q.y);
      a = smoothstep(0.5, 0.44, dia) * (0.7 + 0.3 * step(q.x, 0.0));
    #elif SHAPE == 5
      float lf = abs(q.x) * 3.0 + q.y * q.y * 2.2;
      a = smoothstep(0.52, 0.45, lf);
    #else
      a = smoothstep(0.5, 0.1, abs(p.x)) * smoothstep(0.09, 0.0, abs(p.y));
    #endif
    vec3 base = uRainbow > 0.5 ? hsv2rgb(vec3(vHue, 0.85, 1.0)) : uColorA;
    vec3 col = mix(base, uColorB, vMix);
    float alpha = clamp(a * vAlpha, 0.0, 1.0);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col * uIntensity, alpha);
  }
`

function makeSeeds(count, seed) {
  let s = seed || 1
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  const arr = new Float32Array(count * 4)
  for (let i = 0; i < arr.length; i += 1) arr[i] = rnd()
  return arr
}

/**
 * @param {{ pattern?: string, shape?: string, count?: number, size?: number,
 *   a?: string, b?: string, speed?: number, radius?: number, height?: number,
 *   length?: number, intensity?: number, seed?: number }} props
 */
export function Particles({
  pattern = 'rise',
  shape = 'dot',
  count = 60,
  size = 0.15,
  a = '#ffffff',
  b = '#ffffff',
  speed = 1,
  radius = 0.8,
  height = 2.2,
  length = 6,
  intensity = 2.2,
  seed = 1,
  ...props
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    // Positions are computed in the shader; this attribute only sizes the draw.
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(makeSeeds(count, seed * 7 + count), 4))
    return g
  }, [count, seed])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        defines: {
          PATTERN: Math.max(0, PATTERNS.indexOf(pattern)),
          SHAPE: Math.max(0, SHAPES.indexOf(shape)),
        },
        uniforms: {
          uTime: timeUniform,
          uSpeed: { value: speed },
          uSize: { value: size },
          uRadius: { value: radius },
          uHeight: { value: height },
          uLength: { value: length },
          uPx: { value: 500 },
          uColorA: { value: new Color(a === 'rainbow' ? '#ffffff' : a) },
          uColorB: { value: new Color(b === 'rainbow' ? '#ffffff' : b) },
          uRainbow: { value: a === 'rainbow' ? 1 : 0 },
          uIntensity: { value: intensity },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
        toneMapped: false,
      }),
    [pattern, shape, speed, size, radius, height, length, a, b, intensity],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  // World-size points: scale by the projection so size is in world units.
  // gl_PointSize is in drawing-buffer pixels, hence the dpr.
  useFrame(({ size: canvasSize, camera, viewport }) => {
    const fov = ((camera.fov ?? 50) * Math.PI) / 180
    material.uniforms.uPx.value = (canvasSize.height * viewport.dpr * 0.5) / Math.tan(fov / 2)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} {...props} />
}

export default Particles
