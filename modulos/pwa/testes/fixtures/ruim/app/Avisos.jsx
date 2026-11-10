'use client'
const VAPID_PRIVADA = 'abc'
export function Avisos() {
  useEffect(() => { Notification.requestPermission() }, [])
  return <input className="text-sm border" />
}
