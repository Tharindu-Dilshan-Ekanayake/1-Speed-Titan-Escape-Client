import AuthHUD from './AuthHUD'
import Controls from './Controls'
import BottomBar from './hud/BottomBar'
import CornerTools from './hud/CornerTools'
import LeftMenu from './hud/LeftMenu'
import {
  LevelUpSplash,
  QuestWatcher,
  ReviveModal,
  AirMeter,
  StageBanner,
  StepPopups,
  Toasts,
  WinFlash,
} from './hud/Overlays'
import RightColumn from './hud/RightColumn'
import TopBar from './hud/TopBar'
import TouchControls from './hud/TouchControls'
import { useHotkeys } from './hud/useHotkeys'
import { PanelHost } from './panels/Panels'

/**
 * Everything drawn over the canvas. The wrapper ignores the pointer so camera drags
 * pass through; interactive pieces opt back in with pointer-events-auto.
 */
export function HUD() {
  useHotkeys()
  return (
    <div className="hud pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <StepPopups />
      <TopBar />
      <AuthHUD />
      <LeftMenu />
      <RightColumn />
      <BottomBar />
      <Controls />
      <CornerTools />
      <TouchControls />
      <StageBanner />
      <AirMeter />
      <LevelUpSplash />
      <WinFlash />
      <Toasts />
      <QuestWatcher />
      <ReviveModal />
      <PanelHost />
    </div>
  )
}

export default HUD
