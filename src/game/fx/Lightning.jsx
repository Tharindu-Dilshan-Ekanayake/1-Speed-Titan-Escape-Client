import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color } from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/**
 * Crackling electric arcs. Each bolt is a jagged fat line re-rolled every few frames
 * between two random points inside a region (a cylinder around a character, or a box
 * along a treadmill).
 *
 * @param {{ color?: string, count?: number, radius?: number, height?: number,
 *   box?: [number, number, number] | null, width?: number, rate?: number }} props
 */
export function Lightning({
  color = '#9ff4ff',
  count = 3,
  radius = 0.7,
  height = 2,
  box = null,
  width = 3,
  rate = 0.07,
  segments = 7,
  ...props
}) {
  const size = useThree((s) => s.size)

  const bolts = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const geometry = new LineGeometry()
        geometry.setPositions(new Float32Array((segments + 1) * 3))
        const material = new LineMaterial({
          color: new Color(color).multiplyScalar(3),
          linewidth: width,
          transparent: true,
          opacity: 1,
          depthWrite: false,
          toneMapped: false,
        })
        const line = new Line2(geometry, material)
        line.frustumCulled = false
        return line
      }),
    [count, color, width, segments],
  )

  useEffect(
    () => () =>
      bolts.forEach((b) => {
        b.geometry.dispose()
        b.material.dispose()
      }),
    [bolts],
  )

  const timer = useRef(0)
  const buf = useMemo(() => new Float32Array((segments + 1) * 3), [segments])

  const randomPoint = () => {
    if (box) {
      return [
        (Math.random() - 0.5) * box[0],
        Math.random() * box[1],
        (Math.random() - 0.5) * box[2],
      ]
    }
    const a = Math.random() * Math.PI * 2
    const r = radius * (0.6 + Math.random() * 0.5)
    return [Math.cos(a) * r, Math.random() * height, Math.sin(a) * r]
  }

  useFrame((_s, delta) => {
    for (const b of bolts) b.material.resolution.set(size.width, size.height)
    timer.current -= delta
    if (timer.current > 0) return
    timer.current = rate
    for (const bolt of bolts) {
      // Some bolts blink off for a frame - reads as crackle, not a static web.
      bolt.visible = Math.random() > 0.25
      const a = randomPoint()
      const b = randomPoint()
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments
        const jitter = i === 0 || i === segments ? 0 : 0.22
        buf[i * 3] = a[0] + (b[0] - a[0]) * t + (Math.random() - 0.5) * jitter
        buf[i * 3 + 1] = a[1] + (b[1] - a[1]) * t + (Math.random() - 0.5) * jitter
        buf[i * 3 + 2] = a[2] + (b[2] - a[2]) * t + (Math.random() - 0.5) * jitter
      }
      bolt.geometry.setPositions(buf)
    }
  })

  return (
    <group {...props}>
      {bolts.map((b) => (
        <primitive key={b.uuid} object={b} />
      ))}
    </group>
  )
}

export default Lightning
