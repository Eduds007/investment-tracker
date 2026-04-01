import { useEffect, useState } from 'react'
import axios from 'axios'

export default function DashboardSummary() {
  const [totalPatrimonio, setTotalPatrimonio] = useState(0)
  const [patrimonioAnterior30d, setPatrimonioAnterior30d] = useState(0)
  const [metaPatrimonio, setMetaPatrimonio] = useState(0)
  const [percentualPatrimonio, setPercentualPatrimonio] = useState(0)
  
  const [mediaDividendos, setMediaDividendos] = useState(0)
  const [dividendosAnterior30d, setDividendosAnterior30d] = useState(0)
  const [metaDividendos, setMetaDividendos] = useState(0)
  const [percentualDividendos, setPercentualDividendos] = useState(0)
  
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

      // Calcular dividendos do último mês
      const dividendos = divRes.data || []
      const dividendosUltimo30d = dividendos.filter((div) => {
        const divData = new Date(div.data)
        return divData >= dias30AtrasData && divData <= hoje
      })

      const totalDividendosUltimo30d = dividendosUltimo30d.reduce(
        (sum, div) => sum + Number(div.valor),
        0
      )

      // Calcular dividendos de 30-60 dias atrás
      const dias60AtrasData = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000)
      let dividendosAnterior30dData = dividendos.filter((div) => {
        const divData = new Date(div.data)
        return divData >= dias60AtrasData && divData < dias30AtrasData
      })

      // Se não houver dados de 30-60 dias atrás, pegar o registro mais antigo
      if (dividendosAnterior30dData.length === 0) {
        dividendosAnterior30dData = dividendos.filter((div) => {
          const divData = new Date(div.data)
          return divData < dias30AtrasData
        })
      }

      const totalDividendosAnterior30d = dividendosAnterior30dData.reduce(
        (sum, div) => sum + Number(div.valor),
        0
      )

      // Calcular média dos últimos 12 meses
      const dividendosUltimos12Meses = dividendos.filter((div) => {
        const divData = new Date(div.data)
        const diffMs = hoje - divData
        const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30.44)
        return diffMeses <= 12
      })

      const mediaDivs =
        dividendosUltimos12Meses.length > 0
          ? dividendosUltimos12Meses.reduce((sum, div) => sum + Number(div.valor), 0) / 12
          : 0

      setTotalPatrimonio(totalAtivos)
      setPatrimonioAnterior30d(totalAtivos30d)
      setMediaDividendos(mediaDivs)
      setDividendosAnterior30d(totalDividendosAnterior30d)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    // Buscar metas do localStorage
    const metaPat = parseFloat(localStorage.getItem('metaPatrimonio') || '100000')
    const metaDiv = parseFloat(localStorage.getItem('metaDividendos') || '1000')
    
    setMetaPatrimonio(metaPat)
    setMetaDividendos(metaDiv)

    const percPat = metaPat > 0 ? (totalPatrimonio / metaPat) * 100 : 0
    const percDiv = metaDiv > 0 ? (mediaDividendos / metaDiv) * 100 : 0

    setPercentualPatrimonio(percPat)
    setPercentualDividendos(percDiv)
  }, [totalPatrimonio, mediaDividendos])

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
  const variacaoDividendos = calcularVariacao(mediaDividendos * 30, dividendosAnterior30d)

  const getVariacaoColor = (valor) => {
    if (valor >= 0) return 'text-green-400'
    return 'text-red-400'
  }

  if (loading) return <div className="p-4 text-white">Carregando dados...</div>

  return (
    <div className="mb-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
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
            <h3 className="mb-1 text-sm font-semibold text-emerald-300">Dividendos Mensais</h3>
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
      </div>
    </div>
  )
}
