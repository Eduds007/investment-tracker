import { useState, useEffect } from 'react'
import axios from 'axios'

export default function RecomendadoresPage() {
  const [recomendacoes, setRecomendacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    carregarRecomendacoes()
  }, [])

  const carregarRecomendacoes = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const response = await axios.get('http://localhost:8000/api/recomendadores/')
      if (response.data.success) {
        setRecomendacoes(response.data.data)
      } else {
        setErro('Erro ao carregar recomendações')
      }
    } catch (err) {
      setErro(`Erro ao conectar com o servidor: ${err.message}`)
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  const getSectorColor = (setor) => {
    const colors = {
      Energia: 'bg-red-100 text-red-800',
      Mineração: 'bg-yellow-100 text-yellow-800',
      Financeiro: 'bg-blue-100 text-blue-800',
      Tecnologia: 'bg-purple-100 text-purple-800',
      Varejo: 'bg-green-100 text-green-800',
      Saúde: 'bg-pink-100 text-pink-800',
      Utilidades: 'bg-indigo-100 text-indigo-800'
    }
    return colors[setor] || 'bg-gray-100 text-gray-800'
  }

  const getRiscoLevel = (score) => {
    if (score >= 8) return 'Baixo'
    if (score >= 6) return 'Médio'
    return 'Alto'
  }

  const getRiscoColor = (risco) => {
    const colors = {
      Baixo: 'text-green-500',
      Médio: 'text-yellow-500',
      Alto: 'text-red-500'
    }
    return colors[risco] || 'text-gray-500'
  }

  const getRecomendacaoColor = (recomendacao) => {
    const colors = {
      COMPRA: 'bg-green-100 border-green-300',
      ESPERA: 'bg-yellow-100 border-yellow-300',
      VENDA: 'bg-red-100 border-red-300'
    }
    return colors[recomendacao] || 'bg-gray-100 border-gray-300'
  }

  const getRecomendacaoTextColor = (recomendacao) => {
    const colors = {
      COMPRA: 'text-green-700 font-bold',
      ESPERA: 'text-yellow-700 font-bold',
      VENDA: 'text-red-700 font-bold'
    }
    return colors[recomendacao] || 'text-gray-700'
  }

  if (carregando) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-300">Carregando recomendações...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-50 p-4">
        <p className="text-red-700">{erro}</p>
        <button
          onClick={carregarRecomendacoes}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  const scoreMedia = recomendacoes.length > 0
    ? (recomendacoes.reduce((acc, r) => acc + r.score, 0) / recomendacoes.length).toFixed(1)
    : '0.0'

  const potencialMedia = recomendacoes.length > 0
    ? (recomendacoes.reduce((acc, r) => acc + r.potencial, 0) / recomendacoes.length).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm font-medium text-gray-400">Recomendações Ativas</div>
          <div className="mt-2 text-3xl font-bold text-white">{recomendacoes.length}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm font-medium text-gray-400">Score Médio</div>
          <div className="mt-2 text-3xl font-bold text-white">{scoreMedia}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-sm font-medium text-gray-400">Potencial Médio</div>
          <div className="mt-2 text-3xl font-bold text-green-500">{potencialMedia}%</div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Principais Recomendações</h2>
        {recomendacoes.length > 0 ? (
          recomendacoes.map((rec, idx) => (
            <div
              key={idx}
              className={`rounded-lg border-2 p-6 ${getRecomendacaoColor(rec.recomendacao)}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">{rec.ticker}</h3>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getSectorColor(rec.setor)}`}>
                      {rec.setor}
                    </span>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getRecomendacaoTextColor(rec.recomendacao)}`}>
                      {rec.recomendacao}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 font-medium">{rec.empresa}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Yield Anual</p>
                      <p className="text-lg font-bold text-gray-900">{rec.yield.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Yield Mínimo</p>
                      <p className="text-lg font-bold text-gray-900">{rec.minus_dp.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Desvio Padrão</p>
                      <p className="text-lg font-bold text-gray-900">{rec.dp.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Potencial</p>
                      <p className={`text-lg font-bold ${rec.potencial > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {rec.potencial.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="rounded-lg bg-gray-900 px-4 py-2 text-center">
                    <div className="text-xs font-medium text-gray-400">Score</div>
                    <div className="text-2xl font-bold text-white">{rec.score.toFixed(1)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-600">Preço Atual</div>
                    <div className="text-lg font-bold text-gray-900">R$ {rec.preco.toFixed(2)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-600">Preço-Alvo</div>
                    <div className="text-lg font-bold text-blue-600">R$ {rec.preco_alvo.toFixed(2)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-600">Risco</div>
                    <div className={`text-lg font-bold ${getRiscoColor(getRiscoLevel(rec.score))}`}>
                      {getRiscoLevel(rec.score)}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Adicionar ao Portfólio
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-gray-600 bg-gray-900 p-6 text-center">
            <p className="text-gray-400">Nenhuma recomendação disponível</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-gray-600 bg-gray-900 p-6 text-center">
        <p className="text-gray-400">
          💡 As recomendações são baseadas em análise de dividendos históricos e potencial de valorização
        </p>
      </div>
    </div>
  )
}
