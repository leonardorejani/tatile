// Entrada web da demo RN. No app Expo, o equivalente fica no index.js:
//   SplashScreen.preventAutoHideAsync()
//   const storage = await hydrateShapeStorage(AsyncStorage)
//   ... render <App storage={storage} /> e SplashScreen.hideAsync()
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppRegistry } from 'react-native'
import { hydrateShapeStorage } from '../../codigo/shape-store'
import { App, SEED, type Servidor } from './app'

const params = new URLSearchParams(location.search)
const userId = params.get('u') ?? 'a'
const delay = Number(params.get('delay') ?? 1200)

// "Servidor" lento, guardado no AsyncStorage por usuario
const dbKey = `demo-db:${userId}`
const servidor: Servidor = {
  async load() {
    let db = SEED
    try {
      db = { ...SEED, ...JSON.parse((await AsyncStorage.getItem(dbKey)) ?? 'null') } // quadro antigo ganha os campos novos
    } catch {}
    await new Promise(r => setTimeout(r, delay))
    return db
  },
  save(db) {
    AsyncStorage.setItem(dbKey, JSON.stringify(db)).catch(() => {})
  },
}

const storage = await hydrateShapeStorage(AsyncStorage)
const props = { userId, fixo: params.get('modo') === 'fixo', version: Number(params.get('v') ?? 2) /* 2: formato da forma mudou na 1.0.1 */, storage, servidor }
AppRegistry.registerComponent('demo', () => () => <App {...props} />)
AppRegistry.runApplication('demo', { rootTag: document.getElementById('root') })
