import { useSoundBridge } from './audio/useSoundBridge'
import GameScene from './game/GameScene'
import { useNetBridge } from './net/useNetBridge'
import { usePersistence } from './state/persistence'
import HUD from './ui/HUD'
import LoadingScreen from './ui/LoadingScreen'

function App() {
  const saveLoaded = usePersistence()
  useNetBridge(saveLoaded)
  useSoundBridge()
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1a1330]">
      <GameScene />
      <HUD />
      <LoadingScreen saveLoaded={saveLoaded} />
    </div>
  )
}

export default App
