import { AuraIcon, GiftIcon, RebirthIcon, StatsIcon, StoreIcon, TeleportIcon } from '../icons'

/** The left menu, and the hotkey for each tile (also handled in useHotkeys). */
export const MENU = [
  { panel: 'rebirth', label: 'Rebirth', key: 'R', tone: 'tile-red', Icon: RebirthIcon },
  { panel: 'heroes', label: 'Heroes', key: 'H', tone: 'tile-purple', Icon: AuraIcon },
  { panel: 'store', label: 'Store', key: 'B', tone: 'tile-orange', Icon: StoreIcon },
  { panel: 'rewards', label: 'Rewards', key: 'G', tone: 'tile-pink', Icon: GiftIcon },
  { panel: 'teleport', label: 'Teleport', key: 'T', tone: 'tile-blue', Icon: TeleportIcon },
  { panel: 'stats', label: 'Stats', key: 'I', tone: 'tile-dark', Icon: StatsIcon },
]

