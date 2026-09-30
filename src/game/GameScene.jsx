import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Color, Fog, NeutralToneMapping, Object3D } from 'three'

import { useBloxity } from '../bloxity/BloxityContext'
import { BIOMES } from '../config/biomes'
import { GRAVITY } from '../config/progression'
import { STAGES } from '../config/stages'
import { useProgress } from '../state/progressStore'
import { useSession } from '../state/sessionStore'
import FollowCamera from './FollowCamera'
import { timeUniform } from './fx/materials'
import RemotePlayers from './net/RemotePlayers'
import Player from './Player'
import { playerState } from './playerState'
import Course from './world/Course'
import { Lobby, World2Hub } from './world/Hubs'
import { SplashFx } from './world/Scenery'

/**
 * Fires `onFirstFrame` after the renderer has actually drawn once.
 * `loadingEnd()` should mean "the player can see the game", not "React mounted".
 */
function FirstFrameSignal({ onFirstFrame }) {
  const fired = useRef(false)
  useFrame(() => {
    if (fired.current) return
    fired.current = true
    onFirstFrame()
  })
  return null
}

/** Drives every shader's shared `uTime`. */
function ShaderClock() {
  useFrame(({ clock }) => {
    timeUniform.value = clock.elapsedTime
  })
  return null
}

const HUB_ATMOSPHERE = {
  1: { sky: '#d9d5f7', fog: [110, 360] },
  2: { sky: '#1d2352', fog: [70, 300] },
}

/** Sky colour + fog: each biome brings its own; hubs have theirs. Eases between them. */
function Atmosphere() {
  const world = useSession((s) => s.world)
  const stage = useSession((s) => s.stage)
  const scene = useThree((s) => s.scene)
  const target = useMemo(() => new Color(), [])
  const a = stage > 0 ? BIOMES[STAGES[world][stage - 1].biome] : HUB_ATMOSPHERE[world]
  useFrame((_s, delta) => {
    if (!scene.background?.isColor) scene.background = new Color(a.sky)
    if (!scene.fog) scene.fog = new Fog(a.sky, a.fog[0], a.fog[1])
    target.set(a.sky)
    const k = 1 - Math.pow(0.02, delta)
    scene.background.lerp(target, k)
    scene.fog.color.copy(scene.background)
    scene.fog.near += (a.fog[0] - scene.fog.near) * k
    scene.fog.far += (a.fog[1] - scene.fog.far) * k
  })
  return null
}

/** Sun whose shadow frustum follows the player along the (long) course. */
function Sun({ shadows }) {
  const light = useRef(null)
  const target = useMemo(() => new Object3D(), [])
  useFrame(() => {
    const p = playerState.pos
    if (!light.current) return
    light.current.position.set(p.x + 16, p.y + 38, p.z + 14)
    target.position.copy(p)
    target.updateMatrixWorld()
  })
  return (
    <>
      <directionalLight
        ref={light}
        target={target}
        castShadow={shadows}
        intensity={2.1}
        color="#fff6ea"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <primitive object={target} />
    </>
  )
}

export function GameScene() {
  const { game } = useBloxity()
  const playerBodyRef = useRef(null)
  const high = useProgress((s) => s.settings.graphics !== 'low')

  const [avatarReady, setAvatarReady] = useState(false)
  const loadingEnded = useRef(false)

  const handleAvatarReady = useCallback(() => setAvatarReady(true), [])

  // Only end the loading screen once the avatar has finished assembling *and* a
  // frame has rendered with it in place.
  const handleFirstFrame = useCallback(() => {
    if (loadingEnded.current || !avatarReady) return
    loadingEnded.current = true
    game.loadingEnd()
    useSession.getState().setWorldReady()
  }, [avatarReady, game])

  // The first frame usually renders before the avatar finishes downloading, so the
  // frame callback alone isn't enough — close the loading screen here too.
  useEffect(() => {
    if (!avatarReady || loadingEnded.current) return
    loadingEnded.current = true
    game.loadingEnd()
    useSession.getState().setWorldReady()
  }, [avatarReady, game])

  // Never hold the player on the loading screen if the avatar CDN is unreachable.
  useEffect(() => {
    const id = setTimeout(() => useSession.getState().setWorldReady(), 15000)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    game.loadingStep('Building the castle…')
  }, [game])

  return (
    <Canvas
      key={high ? 'high' : 'low'}
      shadows={high}
      dpr={high ? [1, 1.75] : [0.75, 1]}
      camera={{ position: [0, 6, 32], fov: 62, near: 0.1, far: 900 }}
      gl={{ powerPreference: 'high-performance', antialias: !high }}
      onCreated={({ gl, scene, camera }) => {
        gl.toneMapping = NeutralToneMapping
        gl.toneMappingExposure = 1.05
        if (import.meta.env.DEV && window.__game) window.__game.three = { scene, camera, gl }
      }}
    >
      <Atmosphere />
      <ShaderClock />
      <hemisphereLight args={['#ffffff', '#9f97cf', 1.5]} />
      <ambientLight intensity={0.25} />
      <Sun shadows={high} />

      <Suspense fallback={null}>
        <Physics gravity={[0, GRAVITY, 0]}>
          <Lobby />
          <World2Hub />
          <Course world={1} />
          <Course world={2} />
          <Player bodyRef={playerBodyRef} onAvatarReady={handleAvatarReady} />
          <RemotePlayers />
          <FollowCamera bodyRef={playerBodyRef} />
        </Physics>
        <SplashFx />
      </Suspense>

      <FirstFrameSignal onFirstFrame={handleFirstFrame} />

      {high && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

export default GameScene
