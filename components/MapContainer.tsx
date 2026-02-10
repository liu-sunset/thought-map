'use client'

import { useEffect, useState } from 'react'
import ChinaEChartsMap from './map/ChinaEChartsMap'
import { useStore } from '@/lib/store'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { MessageList } from './panel/MessageList'
import { LightUpButton } from './panel/LightUpButton'
import { DevTools } from './DevTools'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Province } from '@prisma/client'

interface GeoInfo {
  province: string | null
  cnName?: string
  allowed: boolean
  ip?: string
  isMock?: boolean
  hasLitUpToday?: boolean
}

interface MapContainerProps {
  initialProvinces: Province[]
  geoInfo: GeoInfo
}

export default function MapContainer({ initialProvinces, geoInfo }: MapContainerProps) {
  const { selectedProvince, setSelectedProvince, setGeoInfo } = useStore()
  const [provinces, setProvinces] = useState(initialProvinces)
  const [isMobile, setIsMobile] = useState(false)
  const [hasLitUp, setHasLitUp] = useState(geoInfo.hasLitUpToday || false)

  useEffect(() => {
    setGeoInfo(geoInfo)
    setHasLitUp(geoInfo.hasLitUpToday || false)
    if (geoInfo.province) {
       setSelectedProvince(geoInfo.province)
    }
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [geoInfo, setGeoInfo, setSelectedProvince])

  const handleLightUpSuccess = (newCount: number) => {
    setHasLitUp(true)
    if (selectedProvince) {
      setProvinces(prev => prev.map(p => p.name === selectedProvince ? { ...p, count: newCount } : p))
    }
  }

  const isCurrentLocation = geoInfo.province === selectedProvince || (!!geoInfo.isMock && geoInfo.province === selectedProvince)

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Map Area */}
      <div 
        className={cn(
          "w-full h-full transition-transform duration-400 ease-out will-change-transform",
          selectedProvince && !isMobile ? "-translate-x-[200px]" : "translate-x-0"
        )}
      >
        <ChinaEChartsMap provinceData={provinces} />
      </div>

      {/* Desktop Panel */}
      {!isMobile && (
        <div 
          className={cn(
            "w-[400px] h-full border-l border-zinc-800 bg-zinc-950/80 backdrop-blur-xl p-6 absolute right-0 top-0 bottom-0 z-10",
            "transition-all duration-350 ease-out will-change-transform",
            selectedProvince 
              ? "translate-x-0 opacity-100" 
              : "translate-x-full opacity-0 pointer-events-none"
          )}
        >
          {/* Only render content when selectedProvince is present to avoid stale data flashing, 
              but keep container for animation if needed. 
              Actually, if we unmount content, animation might be tricky. 
              Let's keep the container always mounted but hide it via css. 
              However, MessageList depends on selectedProvince. 
              We can render it conditionally or pass null. 
          */}
           {selectedProvince && (
             <div className="h-full flex flex-col">
               <div className="flex-1 overflow-hidden">
                  <MessageList provinceName={selectedProvince} canPost={isCurrentLocation} />
               </div>
               {isCurrentLocation && !hasLitUp && (
                 <div className="mt-6 flex justify-center">
                    <LightUpButton provinceName={selectedProvince} onSuccess={handleLightUpSuccess} />
                 </div>
               )}
               <Button 
                 variant="ghost" 
                 className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                 onClick={() => setSelectedProvince(null)}
               >
                 ✕
               </Button>
             </div>
           )}
        </div>
      )}

      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={!!selectedProvince} onOpenChange={(open) => !open && setSelectedProvince(null)}>
          <SheetContent side="bottom" className="h-[80vh] bg-zinc-950 border-t border-zinc-800 text-white">
             {selectedProvince && (
               <div className="h-full flex flex-col pt-4">
                  <div className="flex-1 overflow-hidden">
                    <MessageList provinceName={selectedProvince} canPost={isCurrentLocation} />
                  </div>
                  {isCurrentLocation && !hasLitUp && (
                    <div className="mt-4 flex justify-center pb-8">
                       <LightUpButton provinceName={selectedProvince} onSuccess={handleLightUpSuccess} />
                    </div>
                  )}
               </div>
             )}
          </SheetContent>
        </Sheet>
      )}

      {/* Floating Action Button */}
      {geoInfo.allowed && !selectedProvince && geoInfo.province && !hasLitUp && (
        <div className="absolute bottom-10 right-10 animate-bounce z-10">
           <LightUpButton provinceName={geoInfo.province} onSuccess={handleLightUpSuccess} />
        </div>
      )}

      <DevTools />
    </div>
  )
}
