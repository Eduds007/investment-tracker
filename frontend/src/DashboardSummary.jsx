import { useEffect, useState } from 'react'
import axios from 'axios'

export default function DashboardSummary({ refreshKey = 0 }) {
  const [totalPatrimonio, setTotalPatrimonio] = useState(0)
  const [patrimonioAnterior30d, setPatrimonioAnterior30d] = useState(0)
  const [metaPatrimonio, setMetaPatrimonio] = useState(0)
  const [percentualPatrimonio, setPercentualPatrimonio] = useState(0)
  
  const [mediaDividendos, setMediaDividendos] = useState(0)
  const [mediaDividendos12m, setMediaDividendos12m] = useState(0)
  const [metaDividendos, setMetaDividendos] = useState(0)
  const [percentualDividendos, setPercentualDividendos] = useState(0)


  const [mediaAportes, setMediaAportes] = useState(0)
  const [mediaAportes12m, setMediaAportes12m] = useState(0)
  const [metaAportes, setMetaAportes] = useState(0)
  const [percentualAportes, setPercentualAportes] = useState(0)

  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('http://localhost:8000/api/posicoes/'),
      axios.get('http://localhost:8000/api/dividendos/'),
    ]).then(([posRes, divRes]) => {
      // Calcular valor total dos ativos (última data)
      const posicoes = posRes.data || []
      let ultimaData = null
      let data30DiasAtras = null
      let dataAnterior = null
      let totalAtivos = 0
      let totalAtivos30d = 0

      const hoje = new Date()
      const dias30AtrasData = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)

      posicoes.forEach((pos) => {
        const dataParcela = new Date(pos.data)
        
        // Pegar patrimônio mais recente
        if (!ultimaData || dataParcela > ultimaData) {
          ultimaData = dataParcela
        }

        // Pegar o registro mais antigo (para fallback)
        if (!dataAnterior || dataParcela < dataAnterior) {
          dataAnterior = dataParcela
        }

        // Pegar patrimônio de 30 dias atrás
        if (dataParcela <= dias30AtrasData) {
          if (!data30DiasAtras || dataParcela > data30DiasAtras) {
            data30DiasAtras = dataParcela
          }
        }
      })

      // Somar patrimônio atual
      if (ultimaData) {
        const posicoesMaisRecentes = posicoes.filter(
          (pos) => new Date(pos.data).getTime() === ultimaData.getTime()
        )
        totalAtivos = posicoesMaisRecentes.reduce((sum, pos) => sum + Number(pos.valor), 0)
      }

      // Somar patrimônio de 30 dias atrás, ou do registro mais antigo se não houver
      const dataComParacao = data30DiasAtras || dataAnterior
      if (dataComParacao) {
        const posicoeComparacao = posicoes.filter(
          (pos) => new Date(pos.data).getTime() === dataComParacao.getTime()
        )
        totalAtivos30d = posicoeComparacao.reduce((sum, pos) => sum + Number(pos.valor), 0)
      }

      // Calcular média mensal dos últimos 12 meses e da janela anterior de 12 meses
      const dividendos = divRes.data || []
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
      const inicioJanelaAtual = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
      const inicioJanelaAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 23, 1)

      const calcularMediaJanela12m = (lista, dataInicio, dataFim, getValor) => {
        const totaisMensais = {}

        for (let i = 0; i < 12; i += 1) {
          const d = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, 1)
          const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          totaisMensais[chave] = 0
        }

        lista.forEach((item) => {
          const itemData = new Date(item.data)
          if (itemData >= dataInicio && itemData < dataFim) {
            const chave = `${itemData.getFullYear()}-${String(itemData.getMonth() + 1).padStart(2, '0')}`
            if (chave in totaisMensais) {
              totaisMensais[chave] += getValor(item)
            }
          }
        })

        return Object.values(totaisMensais).reduce((sum, valor) => sum + valor, 0) / 12
      }

      const getValorDividendo = (div) => Number(div.valor)

      const mediaDivs12mAtual = calcularMediaJanela12m(dividendos, inicioJanelaAtual, inicioProximoMes, getValorDividendo)
      const mediaDivs12mAnterior = calcularMediaJanela12m(dividendos, inicioJanelaAnterior, inicioMesAtual, getValorDividendo)

      // Aportes/Saques: registrados como Posições de um Ativo pseudo chamado 'APORTE' ou 'SAQUE'.
      // O valor de cada posição é cumulativo (Registrar Movimentação soma/subtrai do último valor
      // conhecido), então o aporte/saque do período é a diferença em relação ao registro anterior.
      const deltasPorPeriodo = (nomeAtivo, sinal) => {
        const registros = posicoes
          .filter((p) => (p.ativo || '').toString().trim().toUpperCase() === nomeAtivo)
          .sort((a, b) => new Date(a.data) - new Date(b.data))

        let anterior = 0
        return registros.map((p) => {
          const valorAtual = Number(p.valor)
          const delta = valorAtual - anterior
          anterior = valorAtual
          return { data: p.data, valor: sinal * delta }
        })
      }

      const eventosAporte = [...deltasPorPeriodo('APORTE', 1), ...deltasPorPeriodo('SAQUE', -1)]
      const getValorEvento = (e) => e.valor

      const mediaAportes12mAtual = calcularMediaJanela12m(eventosAporte, inicioJanelaAtual, inicioProximoMes, getValorEvento)
      const mediaAportes12mAnterior = calcularMediaJanela12m(eventosAporte, inicioJanelaAnterior, inicioMesAtual, getValorEvento)

      setTotalPatrimonio(totalAtivos)
      setPatrimonioAnterior30d(totalAtivos30d)
      setMediaDividendos(mediaDivs12mAtual)
      setMediaDividendos12m(mediaDivs12mAnterior)
      setMediaAportes(mediaAportes12mAtual)
      setMediaAportes12m(mediaAportes12mAnterior)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [refreshKey])

  useEffect(() => {
    // Buscar metas do localStorage
    const metaPat = parseFloat(localStorage.getItem('metaPatrimonio') || '100000')
    const metaDiv = parseFloat(localStorage.getItem('metaDividendos') || '1000')
    const metaApo = parseFloat(localStorage.getItem('metaAportes') || '1000')

    setMetaPatrimonio(metaPat)
    setMetaDividendos(metaDiv)
    setMetaAportes(metaApo)

    const percPat = metaPat > 0 ? (totalPatrimonio / metaPat) * 100 : 0
    const percDiv = metaDiv > 0 ? (mediaDividendos / metaDiv) * 100 : 0
    const percApo = metaApo > 0 ? (mediaAportes / metaApo) * 100 : 0

    setPercentualPatrimonio(percPat)
    setPercentualDividendos(percDiv)
    setPercentualAportes(percApo)
  }, [totalPatrimonio, mediaDividendos, mediaAportes])

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const getStatusColor = (percentual) => {
    if (percentual >= 100) return 'text-green-400'
    if (percentual >= 75) return 'text-yellow-400'
    return 'text-red-400'
  }

  const calcularVariacao = (atual, anterior) => {
    if (anterior === 0) return { absoluta: 0, relativa: 0 }
    const absoluta = atual - anterior
    const relativa = (absoluta / anterior) * 100
    return { absoluta, relativa }
  }

  const variacaoPatrimonio = calcularVariacao(totalPatrimonio, patrimonioAnterior30d)
  const variacaoDividendos = calcularVariacao(mediaDividendos, mediaDividendos12m)
  const variacaoAportes = calcularVariacao(mediaAportes, mediaAportes12m)

  const getVariacaoColor = (valor) => {
    if (valor >= 0) return 'text-green-400'
    return 'text-red-400'
  }

  if (loading) return <div className="p-4 text-white">Carregando dados...</div>

  return (
    <div className="mb-8 space-y-4">
      <div className="grid gap-4">
        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-sky-300">Patrimônio Total</h3>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{formatarMoeda(totalPatrimonio)}</p>
              <p className={`text-sm ${getVariacaoColor(variacaoPatrimonio.absoluta)}`}>
                (+{formatarMoeda(variacaoPatrimonio.absoluta)} | +{variacaoPatrimonio.relativa.toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Meta: {formatarMoeda(metaPatrimonio)}</span>
            <span className={`font-semibold ${getStatusColor(percentualPatrimonio)}`}>
              {percentualPatrimonio.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${Math.min(percentualPatrimonio, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-emerald-300">Dividendos Mensais (Média 12m)</h3>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{formatarMoeda(mediaDividendos)}</p>
              <p className={`text-sm ${getVariacaoColor(variacaoDividendos.absoluta)}`}>
                (+{formatarMoeda(variacaoDividendos.absoluta)} | +{variacaoDividendos.relativa.toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Meta: {formatarMoeda(metaDividendos)}</span>
            <span className={`font-semibold ${getStatusColor(percentualDividendos)}`}>
              {percentualDividendos.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(percentualDividendos, 100)}%` }}
            />
          </div>
        </div>
                <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-emerald-300">Aportes Mensais (Média 12m)</h3>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{formatarMoeda(mediaAportes)}</p>
              <p className={`text-sm ${getVariacaoColor(variacaoAportes.absoluta)}`}>
                (+{formatarMoeda(variacaoAportes.absoluta)} | +{variacaoAportes.relativa.toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Meta: {formatarMoeda(metaAportes)}</span>
            <span className={`font-semibold ${getStatusColor(percentualAportes)}`}>
              {percentualAportes.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(percentualAportes, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
