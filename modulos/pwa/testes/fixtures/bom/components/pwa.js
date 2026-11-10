'use client'
export const instalado = () => window.matchMedia('(display-mode: standalone)').matches
window.addEventListener('beforeinstallprompt', e => e.preventDefault())
navigator.serviceWorker.register('/sw.js')
export async function ligar() { await Notification.requestPermission() }
