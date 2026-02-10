'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'

import { useStore } from '@/lib/store'

type MapFeature = {
  type: 'Feature'
  id?: string | number
  properties?: Record<string, unknown> & { name?: string; 'hc-group'?: string }
  geometry: unknown
}

type MapGeoJson = {
  type: 'FeatureCollection'
  features: MapFeature[]
  [key: string]: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isMapGeoJson = (value: unknown): value is MapGeoJson => {
  if (!isObject(value)) return false
  if (value.type !== 'FeatureCollection') return false
  if (!Array.isArray(value.features)) return false
  return true
}




interface ChinaEChartsMapProps {
  provinceData: { name: string; count: number; level: number }[]
}

export default function ChinaEChartsMap({ provinceData }: ChinaEChartsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const { selectedProvince, setSelectedProvince } = useStore()
  const [geoJson, setGeoJson] = useState<MapGeoJson | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/map-data.json')
      .then((res) => res.json())
      .then((json: unknown) => {
        if (cancelled) return
        if (!isMapGeoJson(json)) {
          setGeoJson(null)
          return
        }
        const admin1 = json.features.filter((f) => f.properties?.['hc-group'] === 'admin1')
        setGeoJson({ ...json, features: admin1 })
      })
      .catch(() => {
        if (cancelled) return
        setGeoJson(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = chartRef.current ?? echarts.init(el, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const handleClick = (params: unknown) => {
      if (!isObject(params)) return
      const name = params.name
      if (typeof name !== 'string') return
      setSelectedProvince(name)
    }

    chart.on('click', handleClick)
    chart.getZr().on('click', (params) => {
      if (!params.target) {
        setSelectedProvince(null)
      }
    })

    let cleanupResize: (() => void) | null = null
    if (typeof ResizeObserver === 'function') {
      let animationFrameId: number | null = null
      let lastResizeTime = 0

      const ro = new ResizeObserver(() => {
        const now = Date.now()
        // Limit resize to ~30fps (33ms) to balance smoothness and performance
        if (now - lastResizeTime >= 33) {
          chart.resize({
            animation: { duration: 0 }
          })
          lastResizeTime = now
        } else {
          if (animationFrameId) cancelAnimationFrame(animationFrameId)
          animationFrameId = requestAnimationFrame(() => {
             chart.resize({
               animation: { duration: 0 }
             })
             lastResizeTime = Date.now()
          })
        }
      })
      ro.observe(el)
      cleanupResize = () => {
        ro.disconnect()
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
      }
    } else {
      const onResize = () => chart.resize()
      window.addEventListener('resize', onResize)
      cleanupResize = () => window.removeEventListener('resize', onResize)
    }

    return () => {
      cleanupResize?.()
      chart.off('click', handleClick)
    }
  }, [setSelectedProvince])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!geoJson) return
    // cast to any to satisfy TypeScript for echarts.registerMap
    echarts.registerMap('china', geoJson as any)
  }, [geoJson])

  const option: echarts.EChartsOption = useMemo(() => {
    const maxCount = Math.max(1, ...provinceData.map((p) => p.count ?? 0))
    const seriesData = provinceData.map((p) => ({
      name: p.name,
      value: p.count ?? 0,
      selected: selectedProvince === p.name,
    }))

    return {
      animation: true,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(9,9,11,0.92)',
        borderColor: 'rgba(63,63,70,0.8)',
        borderWidth: 1,
        textStyle: { color: '#fafafa' },
        formatter: (params: unknown) => {
          if (!isObject(params)) return ''
          const name = typeof params.name === 'string' ? params.name : ''
          const value =
            typeof params.value === 'number'
              ? params.value
              : isObject(params.data) && typeof params.data.value === 'number'
                ? params.data.value
                : 0
          return `${name}<br/>点亮：${value}`
        },
      },
      visualMap: {
        min: 0,
        max: maxCount,
        show: false,
        inRange: {
          color: ['#52525b', '#b91c1c', '#ef4444'],
        },
        outOfRange: {
          color: ['#52525b'],
        },
      },
      series: [
        {
          type: 'map',
          map: 'china',
          nameProperty: 'name',
          roam: true,
          zoom: 1.08,
          selectedMode: 'single',
          emphasis: {
            label: { show: false },
            itemStyle: {
              borderColor: '#fca5a5',
              borderWidth: 1.5,
            },
          },
          select: {
            label: { show: false },
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 2.5,
              shadowBlur: 18,
              shadowColor: 'rgba(239,68,68,0.65)',
            },
          },
          itemStyle: {
            borderColor: '#09090b',
            borderWidth: 1,
          },
          data: seriesData,
        },
      ],
    }
  }, [provinceData, selectedProvince])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !geoJson) return

    chart.setOption(option)

    if (!selectedProvince) {
      requestAnimationFrame(() => {
        chart.dispatchAction({ type: 'downplay' })
        chart.dispatchAction({ type: 'unselect' })
      })
    }
  }, [geoJson, option, selectedProvince])

  return <div ref={containerRef} className="w-full h-full bg-black" />
}
