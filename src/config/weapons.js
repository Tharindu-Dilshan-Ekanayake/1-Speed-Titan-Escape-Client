/**
 * Blades held in both hands. Bought with Wins in the Store and wielded by your
 * Bloxity avatar; every anime hero instead carries their own signature pair (see
 * HERO_WEAPONS). Cosmetic only.
 *
 * shape: blade | katana | cleaver | axe | scythe | greatsword
 */
export const WEAPONS = [
  {
    id: 'blades',
    name: 'Scout Blades',
    desc: 'Standard-issue steel. Every titan slayer starts here.',
    shape: 'blade',
    price: 0,
    blade: '#d7dfee',
    glow: '#8fd8ff',
    size: 1,
  },
  {
    id: 'ember',
    name: 'Ember Edge',
    desc: 'Forged in the castle lava. Burns with every swing.',
    shape: 'blade',
    price: 150,
    blade: '#ffb27a',
    glow: '#ff5a14',
    size: 1.1,
    fx: 'ember',
  },
  {
    id: 'frost',
    name: 'Frostbite Fang',
    desc: 'A katana carved from glacier ice.',
    shape: 'katana',
    price: 350,
    blade: '#dff6ff',
    glow: '#63d8ff',
    size: 1.15,
    fx: 'frost',
  },
  {
    id: 'thunder',
    name: 'Thunder Cleaver',
    desc: 'Crackles with stolen lightning.',
    shape: 'cleaver',
    price: 700,
    blade: '#fff6b0',
    glow: '#ffe23a',
    size: 1.2,
    fx: 'spark',
  },
  {
    id: 'titanaxe',
    name: 'Titan Splitter',
    desc: 'A war axe heavy enough to fell a colossal.',
    shape: 'axe',
    price: 1200,
    blade: '#e0e4ee',
    glow: '#ff3b4f',
    size: 1.25,
    fx: 'ember',
  },
  {
    id: 'void',
    name: 'Void Reaper',
    desc: 'Drinks the light around it.',
    shape: 'scythe',
    price: 2500,
    blade: '#3a1466',
    glow: '#b84dff',
    size: 1.3,
    fx: 'void',
  },
  {
    id: 'solar',
    name: 'Solar Greatsword',
    desc: 'The sun itself, in blade form.',
    shape: 'greatsword',
    price: 5000,
    blade: '#fff3c4',
    glow: '#ffb31a',
    size: 1.35,
    fx: 'star',
  },
  {
    id: 'prism',
    name: 'Prism Katana',
    desc: 'Every colour at once. The rarest blade in the walls.',
    shape: 'katana',
    price: 12000,
    blade: '#ffffff',
    glow: 'rainbow',
    size: 1.35,
    fx: 'rainbow',
  },
]

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))

/** Each hero's signature pair. */
export const HERO_WEAPONS = {
  kaito: { id: 'kaito', name: 'Blaze Twin Fangs', shape: 'blade', blade: '#ffcf9a', glow: '#ff5a14', size: 1.2, fx: 'ember' },
  yuki: { id: 'yuki', name: 'Glacier Rapier', shape: 'katana', blade: '#e8fbff', glow: '#6fe3ff', size: 1.2, fx: 'frost' },
  raiden: { id: 'raiden', name: 'Stormcaller Kunai', shape: 'cleaver', blade: '#fffbd0', glow: '#3ff0ff', size: 1.1, fx: 'spark' },
  sakura: { id: 'sakura', name: 'Petal Moon Katana', shape: 'katana', blade: '#ffe6f3', glow: '#ff6fc0', size: 1.25, fx: 'petal' },
  shade: { id: 'shade', name: 'Night Reapers', shape: 'scythe', blade: '#2a1446', glow: '#a855ff', size: 1.2, fx: 'void' },
  jade: { id: 'jade', name: 'Serpent Glaives', shape: 'blade', blade: '#d6ffe0', glow: '#2dff7a', size: 1.2, fx: 'leaf' },
  aurelia: { id: 'aurelia', name: 'Dawnbringer', shape: 'greatsword', blade: '#fffbe8', glow: '#ffd84d', size: 1.3, fx: 'star' },
  crimson: { id: 'crimson', name: 'Blood Moon Axes', shape: 'axe', blade: '#3a0710', glow: '#ff1437', size: 1.3, fx: 'ember' },
  nova: { id: 'nova', name: 'Starfall Blades', shape: 'katana', blade: '#f0e8ff', glow: '#ff6bf2', size: 1.25, fx: 'star' },
  zephyr: { id: 'zephyr', name: 'Gale Splitters', shape: 'cleaver', blade: '#f0fffb', glow: '#3dffd2', size: 1.25, fx: 'spark' },
  prism: { id: 'prism', name: 'Spectrum Edge', shape: 'katana', blade: '#ffffff', glow: 'rainbow', size: 1.3, fx: 'rainbow' },
  ragnar: { id: 'ragnar', name: 'Titan King Cleavers', shape: 'greatsword', blade: '#2a0e08', glow: '#ff8a00', size: 1.45, fx: 'ember' },
}

/** The pair a player actually holds: a hero's signature, or their Store pick. */
export function weaponFor(heroId, weaponId) {
  return HERO_WEAPONS[heroId] || WEAPON_BY_ID[weaponId] || WEAPONS[0]
}
