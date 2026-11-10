import './globals.css'
import RegistrarSW from './RegistrarSW'

// Metadados que fazem o app parecer instalado: ícone do iPhone, barra de status, viewport sob o notch.
// Zoom fica liberado: o zoom ao focar campo se resolve com fonte de 16 px, não travando a escala.
export const metadata = {
  title: 'Nome do app',
  description: 'Uma frase do que o app resolve.',
  applicationName: 'Nome curto',
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/icons/apple-touch-icon-180.png',
  },
  appleWebApp: { capable: true, title: 'Nome curto', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <RegistrarSW />
        {children}
      </body>
    </html>
  )
}
