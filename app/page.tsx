import MapContainer from '@/components/MapContainer'
import { getGeoInfo } from '@/lib/actions'
import { prisma } from '@/lib/prisma'
import { PROVINCES } from '@/lib/constants'
import type { Province } from '@prisma/client'

export default async function Home() {
  const geoInfo = await getGeoInfo()
  
  let provinces: Province[] = []
  try {
    provinces = await prisma.province.findMany()
  } catch (e) {
    console.error("DB Error (Expected if no DB):", e)
    // Fallback to constants with 0 count
    provinces = PROVINCES.map(p => ({ ...p, count: 0, level: 0, id: 'mock-' + p.name, createdAt: new Date(), updatedAt: new Date() }))
  }

  if (provinces.length === 0) {
      provinces = PROVINCES.map(p => ({ ...p, count: 0, level: 0, id: 'mock-' + p.name, createdAt: new Date(), updatedAt: new Date() }))
  }

  return (
    <main className="min-h-screen bg-black">
      <MapContainer initialProvinces={provinces} geoInfo={geoInfo} />
    </main>
  )
}
