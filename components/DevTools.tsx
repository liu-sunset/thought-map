'use client'

import { Button } from '@/components/ui/button'
import { setMockProvince } from '@/lib/actions'
import { PROVINCES } from '@/lib/constants'
import { useState, useEffect } from 'react'

export function DevTools() {
  const [open, setOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
     // Check if we are in dev mode (process.env is available in build time but runtime might differ for client)
     // Usually process.env.NODE_ENV is replaced by Next.js
     if (process.env.NODE_ENV === 'development') {
         setIsDev(true)
     }
  }, [])

  if (!isDev) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="opacity-50 hover:opacity-100 bg-black text-white border-zinc-700">
        DevTools
      </Button>
      {open && (
        <div className="absolute bottom-12 left-0 bg-zinc-900 border border-zinc-700 p-4 rounded-lg w-64 max-h-96 overflow-y-auto shadow-xl">
          <h3 className="text-sm font-bold mb-2 text-white">Mock Location</h3>
          <div className="grid grid-cols-2 gap-2">
            {PROVINCES.map(p => (
              <Button 
                key={p.name} 
                variant="ghost" 
                size="sm" 
                className="justify-start text-xs h-6 text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={async () => {
                  await setMockProvince(p.name)
                  window.location.reload()
                }}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}