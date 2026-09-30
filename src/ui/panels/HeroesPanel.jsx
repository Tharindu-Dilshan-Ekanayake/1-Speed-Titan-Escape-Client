import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useRef, useState } from 'react'

import { useBloxity } from '../../bloxity/BloxityContext'
import { AVATAR_ID, HERO_BY_ID, HEROES, RARITIES } from '../../config/heroes'
import HeroModel from '../../game/hero/HeroModel'
import { useHeroPortrait } from '../../game/hero/portraits'
import { currentDeal, heroLockReason, heroPrice, useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { Panel, WinsTag } from '../common'
import { AuraIcon, CheckIcon, LockIcon } from '../icons'

const AURA_NAMES = {
  kaito: 'Ember Blaze',
  yuki: 'Frozen Crown',
  raiden: 'Thunder God',
  sakura: 'Blossom Storm',
  shade: 'Void Abyss',
  jade: 'Serpent Runes',
  aurelia: 'Holy Radiance',
  crimson: 'Blood Moon',
  nova: 'Galaxy Stage',
  zephyr: 'Storm Cyclone',
  prism: 'Prismatic Soul',
  ragnar: 'Solar Titan',
}

function Turntable({ children }) {
  const ref = useRef(null)
  // Shader time (uTime) keeps coming from the game canvas, which is still running
  // underneath; writing it here too would make the two clocks fight.
  useFrame((_s, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6
  })
  return <group ref={ref}>{children}</group>
}

function Preview({ def }) {
  return (
    // offsetSize: the panel pops in with a CSS scale, and a transform-aware measure
    // would lock the canvas at its 40%-size first frame.
    <Canvas
      camera={{ position: [0, 1.5, 4.6], fov: 38 }}
      gl={{ alpha: true }}
      dpr={[1, 1.5]}
      resize={{ offsetSize: true }}
      onCreated={({ camera }) => camera.lookAt(0, 1.15, 0)}
    >
      <hemisphereLight args={['#ffffff', '#6d63b8', 2]} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <Turntable>
        <HeroModel key={def.id} def={def} light />
      </Turntable>
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={1.1} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </Canvas>
  )
}

function HeroCard({ def, selected, onSelect }) {
  const portrait = useHeroPortrait(def.id)
  const rarity = RARITIES[def.rarity]
  const owned = useProgress((s) => s.ownedHeroes.includes(def.id))
  const equipped = useProgress((s) => s.equipped === def.id)
  const lock = useProgress((s) => heroLockReason(def, s))
  const deal = currentDeal().heroId === def.id
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card relative flex flex-col items-center overflow-hidden p-[0.3em] transition-transform ${selected ? 'scale-105' : 'hover:scale-[1.03]'}`}
      style={{
        background: `linear-gradient(180deg, ${rarity.color}55, #1f1840 70%)`,
        outline: selected ? `0.22em solid ${rarity.glow}` : 'none',
      }}
    >
      <div className="relative h-[5em] w-full">
        {portrait && <img src={portrait} alt="" className="h-full w-full object-contain" draggable={false} />}
        {lock && !owned && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0a1f]/45">
            <LockIcon size={2.4} />
          </div>
        )}
        {deal && !owned && (
          <span className="ol-sm absolute left-0 top-0 -rotate-12 rounded-md bg-[#ff2f8e] px-[0.3em] text-[0.95em]">-30%</span>
        )}
      </div>
      <span className="ol-sm w-full truncate text-center text-[1.05em] leading-tight">{def.name}</span>
      <span className="ol-sm text-[0.85em]" style={{ color: rarity.color }}>
        {rarity.label}
      </span>
      <span className="mt-[0.1em]">
        {equipped ? (
          <span className="ol-sm text-[0.95em] text-[#6bff8f]">EQUIPPED</span>
        ) : owned ? (
          <span className="ol-sm text-[0.95em] text-[#a8e6ff]">OWNED</span>
        ) : (
          <WinsTag amount={heroPrice(def)} size={0.95} />
        )}
      </span>
    </button>
  )
}

function AvatarCard({ selected, onSelect }) {
  const { identity } = useBloxity()
  const equipped = useProgress((s) => s.equipped === AVATAR_ID)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card relative flex flex-col items-center overflow-hidden p-[0.3em] transition-transform ${selected ? 'scale-105' : 'hover:scale-[1.03]'}`}
      style={{ background: 'linear-gradient(180deg, #6d7cff55, #1f1840 70%)', outline: selected ? '0.22em solid #b9c2ff' : 'none' }}
    >
      <div className="flex h-[5em] w-full items-center justify-center">
        {identity?.pfp ? (
          <img src={identity.pfp} alt="" className="h-[4.2em] w-[4.2em] rounded-full border-[0.18em] border-[var(--ink)] object-cover" />
        ) : (
          <div className="ol flex h-[4.6em] w-[4.6em] items-center justify-center rounded-full border-[0.18em] border-[var(--ink)] bg-[#6d7cff] text-[1.4em]">
            {(identity?.displayName || identity?.username || 'Y').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <span className="ol-sm text-[1.05em] leading-tight">My Avatar</span>
      <span className="ol-sm text-[0.85em] text-[#b9c2ff]">Bloxity</span>
      <span className="ol-sm mt-[0.1em] text-[0.95em]" style={{ color: equipped ? '#6bff8f' : '#ffffff' }}>
        {equipped ? 'EQUIPPED' : 'FREE'}
      </span>
    </button>
  )
}

export function HeroesPanel() {
  const focus = useSession((s) => s.panelData?.focus)
  const [selectedId, setSelectedId] = useState(focus || HEROES[0].id)
  const def = HERO_BY_ID[selectedId]
  const wins = useProgress((s) => s.wins)
  const owned = useProgress((s) => (def ? s.ownedHeroes.includes(def.id) : true))
  const equipped = useProgress((s) => s.equipped === selectedId)
  const lock = useProgress((s) => (def ? heroLockReason(def, s) : null))
  const buyHero = useProgress((s) => s.buyHero)
  const equip = useProgress((s) => s.equip)
  const toast = useSession((s) => s.toast)

  const price = def ? heroPrice(def) : 0
  const discounted = def && price !== def.price

  const action = () => {
    if (!def || owned) {
      equip(selectedId)
      toast(def ? `${def.name} equipped!` : 'Playing as your Bloxity avatar', '#6bff8f')
      return
    }
    if (lock) {
      toast(`Locked: ${lock}`, '#ff6b6b', 'lock')
      return
    }
    if (buyHero(def.id)) toast(`${def.name} joined your squad!`, '#ffd43a', 'trophy')
    else toast(`Need ${price - wins} more Wins`, '#ff6b6b')
  }

  const rarity = def ? RARITIES[def.rarity] : null

  return (
    <Panel title="Heroes" icon={<AuraIcon size={3.2} />} tone="b-purple" width={68}>
      <div className="flex flex-col gap-[1em] md:flex-row">
        <div className="grid flex-1 grid-cols-3 gap-[0.6em] sm:grid-cols-4">
          <AvatarCard selected={selectedId === AVATAR_ID} onSelect={() => setSelectedId(AVATAR_ID)} />
          {HEROES.map((h) => (
            <HeroCard key={h.id} def={h} selected={selectedId === h.id} onSelect={() => setSelectedId(h.id)} />
          ))}
        </div>

        <div className="card flex w-full flex-col items-center gap-[0.4em] self-start bg-[#1b1538]/80 p-[0.8em] md:sticky md:top-0 md:w-[22em]">
          {def ? (
            <>
              <div className="h-[15em] w-full">
                <Preview def={def} />
              </div>
              <span className="ol title-font text-[2.2em] leading-none" style={{ color: rarity.glow }}>
                {def.name}
              </span>
              <span className="ol-sm text-[1.15em] text-white/85">{def.title}</span>
              <span className="ol-sm rounded-full border-[0.15em] border-[var(--ink)] px-[0.7em] text-[1em]" style={{ background: rarity.color }}>
                {rarity.label} · Aura: {AURA_NAMES[def.id]}
              </span>
            </>
          ) : (
            <>
              <div className="flex h-[15em] w-full flex-col items-center justify-center gap-[0.6em] text-center">
                <span className="ol text-[1.6em]">Your Bloxity Avatar</span>
                <span className="ol-sm text-[1.1em] text-white/80">Play as the character you built on Bloxity. Change it any time in the Bloxity portal.</span>
              </div>
            </>
          )}
          <p className="ol-sm text-center text-[0.95em] text-white/70">
            Heroes are cosmetic - your speed comes from Levels &amp; Rebirths.
          </p>
          <button
            type="button"
            onClick={action}
            disabled={equipped}
            className={`btn ${equipped ? 'b-dark' : owned || !def ? 'b-green' : lock ? 'b-red' : 'b-gold'} mt-auto flex w-full items-center justify-center gap-[0.5em] py-[0.5em]`}
          >
            {equipped ? (
              <>
                <CheckIcon size={1.6} />
                <span className="ol text-[1.7em]">Equipped</span>
              </>
            ) : owned || !def ? (
              <span className="ol text-[1.8em]">Equip</span>
            ) : lock ? (
              <>
                <LockIcon size={1.8} />
                <span className="ol text-[1.5em]">{lock}</span>
              </>
            ) : (
              <>
                <span className="ol text-[1.8em]">Buy</span>
                <WinsTag amount={price} strike={discounted ? def.price : null} size={1.6} />
              </>
            )}
          </button>
        </div>
      </div>
    </Panel>
  )
}

export default HeroesPanel
