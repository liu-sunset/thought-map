import { headers } from 'next/headers'

export async function getClientIp() {
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return headersList.get('x-real-ip') || '127.0.0.1'
}

export async function fetchProvinceFromIp(ip: string): Promise<string | null> {
  try {
    // Using ip-api.com (Free for non-commercial)
    // Note: In production, consider a more robust service or offline DB
    const response = await fetch(`http://ip-api.com/json/${ip}`)
    const data = await response.json()
    
    if (data.status === 'success') {
        // Return regionName (e.g., "Beijing")
        return data.regionName
    }
  } catch (error) {
    console.error('Error fetching IP info:', error)
  }
  return null
}