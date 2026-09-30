import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { memo, useEffect, useMemo, useRef } from 'react'

import { STAGES } from '../../config/stages'
import { mergeBoxes, surfaceMaterial } from '../fx/materials'
import { activeStages, playerState } from '../playerState'
import { Boulder, CylColliders, ShapeSet, StageFloor, TitanWalker } from './Biome'
import { Arrows, GrappleHook, HintSign, WinPad } from './CourseProps'
import {
  BlinkTile,
  BouncePad,
  CollapseTile,
  Conveyor,
  Crusher,
  Disc,
  Geyser,
  IceBody,
  Laser,
  Mover,
  Pendulum,
  Sweeper,
  WindZone,
} from './Obstacles'
import { Banners, FlameCards, FloatingLog, StageGate, TideGauge, TitanPeek, Waterfall } from './Scenery'

/** Stages further than this (along the course) from the player aren't drawn or animated. */
const DRAW_DISTANCE = 190
const NO_SHADOW = new Set(['brick', 'icebrick', 'beam', 'castle', 'window', 'plaster', 'metalplate', 'mossrock', 'sandstone', 'snowrock', 'basalt', 'crystalrock'])

/**
 * One stage: static geometry merged into one mesh per material (a handful of draw
 * calls however many platforms it has), one fixed body holding every static
 * collider, then scenery and the moving obstacles.
 */
const StageView = memo(function StageView({ stage }) {
  const groupRef = useRef(null)

  const meshes = useMemo(() => {
    const byMat = new Map()
    for (const v of stage.visuals) {
      if (!byMat.has(v.mat)) byMat.set(v.mat, [])
      byMat.get(v.mat).push(v)
    }
    return [...byMat.entries()].map(([mat, boxes]) => ({ mat, geometry: mergeBoxes(boxes) }))
  }, [stage])
  useEffect(() => () => meshes.forEach((m) => m.geometry?.dispose()), [meshes])

  const centerZ = (stage.zStart + stage.zEnd) / 2
  const sk = stage.key
  const theme = stage.world === 2 ? 'ice' : stage.index % 4 === 0 ? 'royal' : 'fire'

  useFrame(() => {
    const near =
      Math.abs(playerState.pos.x - stage.originX) < 200 &&
      Math.abs(playerState.pos.z - centerZ) - stage.length / 2 < DRAW_DISTANCE
    if (near) activeStages.add(sk)
    else activeStages.delete(sk)
    if (groupRef.current) groupRef.current.visible = near
  })

  const x = stage.originX
  return (
    <>
      <RigidBody type="fixed" colliders={false} name={`stage-${sk}`}>
        {stage.colliders.map((c, i) => (
          <CuboidCollider key={i} position={c.c} args={c.h} friction={0.6} />
        ))}
      </RigidBody>
      <IceBody colliders={stage.iceColliders} />
      <CylColliders cyls={stage.cyls} />

      <group ref={groupRef}>
        {meshes.map(({ mat, geometry }) => (
          <mesh key={mat} geometry={geometry} material={surfaceMaterial(mat)} castShadow={!NO_SHADOW.has(mat) && !mat.startsWith('glow')} receiveShadow />
        ))}
        <ShapeSet shapes={stage.shapes} />

        {stage.floors.map((f, i) => (
          <StageFloor key={i} stage={stage} floor={f} />
        ))}
        {stage.gauges.map((g, i) => (
          <TideGauge key={i} gauge={g} floor={stage.floors.find((f) => f.kind === 'tide' && f.zTop === g.zTop)} originX={x} half={stage.half} />
        ))}
        {stage.waterfalls.map((w, i) => (
          <Waterfall key={i} fall={w} />
        ))}
        {stage.logs.map((l, i) => (
          <FloatingLog key={i} log={l} />
        ))}

        {stage.index > 1 && <StageGate stage={stage} />}
        <FlameCards points={stage.torches} w={0.9} h={1.5} />
        <Banners list={stage.banners} theme={theme} />
        {stage.titans.map((t, i) => (
          <TitanPeek key={i} titan={t} originX={x} half={stage.half} />
        ))}
        <Arrows list={stage.arrows} color={stage.color} />
        {stage.signs.map((sign, i) => (
          <HintSign key={i} sign={sign} />
        ))}
        {stage.pads.map((pad) => (
          <WinPad key={pad.id} pad={pad} />
        ))}
        {stage.hooks.map((hook) => (
          <GrappleHook key={hook.id} hook={hook} />
        ))}
      </group>

      {stage.walkers.map((w, i) => (
        <TitanWalker key={i} walker={w} sk={sk} />
      ))}
      {stage.rollers.map((o) => (
        <Boulder key={o.id} roller={o} sk={sk} />
      ))}
      {stage.lasers.map((o) => (
        <Laser key={o.id} laser={o} sk={sk} />
      ))}
      {stage.sweepers.map((o) => (
        <Sweeper key={o.id} sweeper={o} sk={sk} />
      ))}
      {stage.pendulums.map((o) => (
        <Pendulum key={o.id} pendulum={o} sk={sk} />
      ))}
      {stage.crushers.map((o) => (
        <Crusher key={o.id} crusher={o} sk={sk} world={stage.world} />
      ))}
      {stage.geysers.map((o) => (
        <Geyser key={o.id} geyser={o} sk={sk} world={stage.world} />
      ))}
      {stage.winds.map((o) => (
        <WindZone key={o.id} wind={o} sk={sk} />
      ))}
      {stage.movers.map((o) => (
        <Mover key={o.id} mover={o} sk={sk} />
      ))}
      {stage.discs.map((o) => (
        <Disc key={o.id} disc={o} sk={sk} />
      ))}
      {stage.blinks.map((o) => (
        <BlinkTile key={o.id} tile={o} sk={sk} />
      ))}
      {stage.collapses.map((o) => (
        <CollapseTile key={o.id} tile={o} sk={sk} />
      ))}
      {stage.bounces.map((o) => (
        <BouncePad key={o.id} pad={o} />
      ))}
      {stage.conveyors.map((o) => (
        <Conveyor key={o.id} belt={o} />
      ))}
    </>
  )
})

export function Course({ world }) {
  return STAGES[world].map((stage) => <StageView key={stage.index} stage={stage} />)
}

export default Course
