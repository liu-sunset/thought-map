'use client'

import { Button } from '@/components/ui/button'
import { lightUpProvince } from '@/lib/actions'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Flame } from 'lucide-react'

interface LightUpButtonProps {
  provinceName: string
  onSuccess: (newCount: number) => void
}

export function LightUpButton({ provinceName, onSuccess }: LightUpButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleLightUp = async () => {
    setLoading(true)
    try {
      const res = await lightUpProvince(provinceName)
      if (res.success && res.count !== undefined) {
        toast.success(`Lit up ${provinceName}!`)
        onSuccess(res.count)
      } else {
        toast.error(res.message || res.error || 'Failed')
      }
    } catch {
      toast.error('Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      size="lg" 
      className="rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-6 text-lg transition-all hover:scale-105"
      onClick={handleLightUp}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Flame className="mr-2 h-6 w-6 fill-white" />}
      Light Up {provinceName}
    </Button>
  )
}
