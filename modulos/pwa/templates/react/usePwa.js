'use client'

import { useEffect, useState } from 'react'
import { desligarNotificacoes, estadoInstalacao, estadoNotificacoes, instalar, ligarNotificacoes, mandarTeste, ouvirInstalacao } from '@/lib/pwa'

export function useInstalacao() {
  const [estado, setEstado] = useState({ podeInstalar: false, plataforma: null, jaInstalado: false })
  useEffect(() => {
    const ler = () => setEstado(estadoInstalacao())
    ler()
    return ouvirInstalacao(ler)
  }, [])
  return { ...estado, instalar }
}

// servidor = { inscrever(inscricao), cancelar(endpoint), testar(inscricao) }
export function useNotificacoes(servidor) {
  const [estado, setEstado] = useState({ carregando: true })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState(null)
  const [testeEnviado, setTesteEnviado] = useState(false)
  const reler = () => estadoNotificacoes().then(setEstado).catch(() => setEstado({ suportado: false }))
  useEffect(() => { reler() }, [])

  async function executar(acao, avisaTeste) {
    setErro(null)
    setTesteEnviado(false)
    setOcupado(true)
    try {
      await acao(servidor)
      setTesteEnviado(avisaTeste)
    } catch (e) {
      setErro(e.message)
    }
    await reler()
    setOcupado(false)
  }

  return {
    ...estado, ocupado, erro, testeEnviado,
    ligar: () => executar(ligarNotificacoes, true),
    desligar: () => executar(desligarNotificacoes, false),
    testar: () => executar(mandarTeste, true),
  }
}
