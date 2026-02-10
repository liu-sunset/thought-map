import { create } from 'zustand'

interface AppState {
  selectedProvince: string | null
  setSelectedProvince: (name: string | null) => void
  geoInfo: {
    province: string | null
    cnName?: string
    allowed: boolean
    ip?: string
    isMock?: boolean
    hasLitUpToday?: boolean
  } | null
  setGeoInfo: (info: AppState['geoInfo']) => void
}

export const useStore = create<AppState>((set) => ({
  selectedProvince: null,
  setSelectedProvince: (name) => set({ selectedProvince: name }),
  geoInfo: null,
  setGeoInfo: (info) => set({ geoInfo: info }),
}))