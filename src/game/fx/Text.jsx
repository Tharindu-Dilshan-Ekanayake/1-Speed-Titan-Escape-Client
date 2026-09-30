import { useMemo } from 'react'
import { DoubleSide } from 'three'

import { textTexture } from './textures'

/**
 * Cartoon-outlined text as a textured quad. `height` is the world height of the
 * quad; width follows the text's aspect.
 */
export function TextPlane({ text, height = 1, opts, glow = 1, doubleSide = false, ...props }) {
  const key = JSON.stringify(opts || {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { texture, aspect } = useMemo(() => textTexture(text, opts), [text, key])
  return (
    <mesh {...props}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={glow <= 1}
        color={[glow, glow, glow]}
        side={doubleSide ? DoubleSide : undefined}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Same, but always faces the camera. */
export function TextSprite({ text, height = 1, opts, glow = 1, depthTest = true, ...props }) {
  const key = JSON.stringify(opts || {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { texture, aspect } = useMemo(() => textTexture(text, opts), [text, key])
  return (
    <sprite scale={[height * aspect, height, 1]} {...props}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={depthTest}
        depthWrite={false}
        toneMapped={glow <= 1}
        color={[glow, glow, glow]}
      />
    </sprite>
  )
}
