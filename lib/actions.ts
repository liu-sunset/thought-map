'use server'

import { prisma } from '@/lib/prisma'
import { getClientIp, fetchProvinceFromIp } from '@/lib/ip-utils'
import { cookies } from 'next/headers'
import { BAD_WORDS } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

export async function getGeoInfo() {
  const ip = await getClientIp()
  let provinceName: string | null = null
  let isMock = false

  // Dev Mode Mock
  if (process.env.NODE_ENV === 'development') {
    const cookieStore = await cookies()
    const mockProvince = cookieStore.get('mock_province')?.value
    if (mockProvince) {
      provinceName = mockProvince
      isMock = true
    }
  }

  if (!provinceName) {
    // If localhost and no mock, handle
    if (ip === '127.0.0.1' || ip === '::1') {
       return { province: null, allowed: false, ip, isMock: false }
    }
    provinceName = await fetchProvinceFromIp(ip)
  }

  // Check if province exists in DB
  if (provinceName) {
    const province = await prisma.province.findFirst({
      where: { 
        OR: [
          { name: { equals: provinceName, mode: 'insensitive' } },
        ]
      }
    })
    if (province) {
      // Check if lit up today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const existingLog = await prisma.ipLog.findFirst({
        where: {
          ipHash: ip,
          action: 'LIGHT_UP',
          createdAt: { gte: today }
        }
      })
      
      return { province: province.name, cnName: province.cnName, allowed: true, ip, isMock, hasLitUpToday: !!existingLog }
    }
  }

  return { province: null, allowed: false, ip, isMock, hasLitUpToday: false }
}

export async function lightUpProvince(provinceName: string) {
  const ip = await getClientIp()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Rate limit: 1 per day per IP
  const existingLog = await prisma.ipLog.findFirst({
    where: {
      ipHash: ip, // In real app, hash this!
      action: 'LIGHT_UP',
      createdAt: { gte: today }
    }
  })

  if (existingLog) {
    return { success: false, message: 'Already lit up today' }
  }

  try {
    const province = await prisma.province.update({
      where: { name: provinceName },
      data: {
        count: { increment: 1 },
      }
    })

    await prisma.ipLog.create({
      data: {
        ipHash: ip,
        action: 'LIGHT_UP'
      }
    })

    revalidatePath('/')
    return { success: true, count: province.count }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Failed to light up' }
  }
}

export async function postMessage(provinceName: string, content: string) {
  const ip = await getClientIp()
  
  // Rate limit: 1 per minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
  const recentMsg = await prisma.message.findFirst({
    where: {
      ipHash: ip,
      createdAt: { gte: oneMinuteAgo }
    }
  })

  if (recentMsg) {
    return { success: false, message: 'Too fast. Wait a minute.' }
  }

  // Content Filter
  const hasBadWord = BAD_WORDS.some(word => content.includes(word))
  let sanitizedContent = content
  if (hasBadWord) {
      BAD_WORDS.forEach(word => {
          sanitizedContent = sanitizedContent.replace(new RegExp(word, 'gi'), '***')
      })
  }

  try {
    const province = await prisma.province.findUnique({ where: { name: provinceName } })
    if (!province) return { success: false, message: 'Province not found' }

    await prisma.message.create({
      data: {
        content: sanitizedContent,
        provinceId: province.id,
        ipHash: ip
      }
    })
    
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Failed to post' }
  }
}

export async function getMessages(provinceName: string) {
  try {
    const province = await prisma.province.findUnique({ 
        where: { name: provinceName },
        include: { 
            messages: { 
                orderBy: { createdAt: 'desc' },
                take: 50
            } 
        }
    })
    return province?.messages || []
  } catch (e) {
      console.error(e)
      return []
  }
}

export async function setMockProvince(provinceName: string) {
  if (process.env.NODE_ENV === 'development') {
     const cookieStore = await cookies()
     cookieStore.set('mock_province', provinceName)
     return { success: true }
  }
  return { success: false }
}