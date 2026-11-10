'use client'

import { useEffect } from 'react'
import { registrarServiceWorker } from '@/lib/pwa'

export default function RegistrarSW() {
  useEffect(() => { registrarServiceWorker('/sw.js') }, [])
  return null
}
