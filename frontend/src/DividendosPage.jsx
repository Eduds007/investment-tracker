import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import axios from 'axios'
import DividendoModal from './DividendoModal'

export default function DividendosPage({ refreshKey: externalRefreshKey = 0 }) {
  const [chartData, setChartData] = useState(null)
  const [yieldChartData, setYieldChartData] = useState(null)
  const [recomendacoesCompra, setRecomendacoesCompra] = useState([])
  const [menorYield12m, setMenorYield12m] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const percentFormatter = (value) => (value === null || value === undefined ? '—' : `${value.toFixed(2)}%`)

  const handleDividendoCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const toNumber = (value) => {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return 0

    const trimmed = value.trim()
    const normalized =
      trimmed.includes(',') && trimmed.includes('.')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  useEffect(() => {
    setLoading(true)
    setError('')

    Promise.all([
      axios.get('http://localhost:8000/api/dividendos/'),
      axios.get('http://localhost:8000/api/posicoes/'),
    ])
      .then(([divRes, posRes]) => {
        const dividendos = divRes.data || []
        const posicoes = posRes.data || []
        const totalsByAtivo = new Map()
        const posicoesPorAtivo = new Map()

        // Pegar data atual e contar 12 meses para trás
        const today = new Date()
        const months = []
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
          months.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            total: 0,
          })
        }

        posicoes.forEach((pos) => {
          const ativoNome = pos.ativo || 'Sem ativo'
          if (!posicoesPorAtivo.has(ativoNome)) {
            posicoesPorAtivo.set(ativoNome, [])
          }

          posicoesPorAtivo.get(ativoNome).push({
            data: new Date(`${pos.data}T00:00:00`),
            valor: toNumber(pos.valor),
            precoMedio: toNumber(pos.preco_medio_compra),
            quantidade: toNumber(pos.quantidade),
            classe: pos.classe_ativo,
          })
        })

        posicoesPorAtivo.forEach((items) => {
          items.sort((a, b) => a.data - b.data)
        })

        // Agrupar dividendos por mês
        dividendos.forEach((div) => {
          const divDate = new Date(`${div.data}T00:00:00`)
          const ativoNome = div.ativo || 'Sem ativo'
          const valor = toNumber(div.valor)

          const currentAtivo = totalsByAtivo.get(ativoNome) || {
            ativo: ativoNome,
            total: 0,
            quantidade: 0,
          }

          currentAtivo.total += valor
          currentAtivo.quantidade += 1
          totalsByAtivo.set(ativoNome, currentAtivo)

          const found = months.find(
            (m) => m.year === divDate.getFullYear() && m.month === divDate.getMonth()
          )
          if (found) {
            found.total += valor
          }
        })

        // Posição mais recente de cada ativo, usada para o preço médio de compra atual
        const posicaoAtualPorAtivo = new Map()
        posicoesPorAtivo.forEach((historico, ativoNome) => {
          posicaoAtualPorAtivo.set(ativoNome, historico[historico.length - 1])
        })

        // Último dividendo pago por ativo (data e valor daquele pagamento específico)
        const ultimoDividendoPorAtivo = new Map()
        // Valor por cota distribuído nos últimos 12 meses (mesma janela do gráfico) por ativo.
        // Usa a quantidade de cotas NA ÉPOCA de cada pagamento (salva no próprio dividendo)
        // sempre que disponível -- importante quando a posição mudou de tamanho no meio da
        // janela. Cai para a quantidade atual como aproximação em registros antigos sem esse dado.
        const mesesValidos = new Set(months.map((m) => `${m.year}-${m.month}`))
        const valorPorCotaUltimos12mPorAtivo = new Map()
        dividendos.forEach((div) => {
          const ativoNome = div.ativo || 'Sem ativo'
          const divDate = new Date(`${div.data}T00:00:00`)
          const valor = toNumber(div.valor)
          const atual = ultimoDividendoPorAtivo.get(ativoNome)
          if (!atual || divDate > atual.data) {
            ultimoDividendoPorAtivo.set(ativoNome, { data: divDate, valor })
          }
          if (mesesValidos.has(`${divDate.getFullYear()}-${divDate.getMonth()}`)) {
            const quantidadeEpoca = toNumber(div.quantidade) || posicaoAtualPorAtivo.get(ativoNome)?.quantidade || 0
            if (quantidadeEpoca > 0) {
              const porCota = valor / quantidadeEpoca
              valorPorCotaUltimos12mPorAtivo.set(ativoNome, (valorPorCotaUltimos12mPorAtivo.get(ativoNome) || 0) + porCota)
            }
          }
        })

        const percentualUltimos12m = (ativoNome, posicaoAtual) => {
          const valorPorCota12m = valorPorCotaUltimos12mPorAtivo.get(ativoNome) || 0
          const precoMedio = posicaoAtual?.precoMedio || 0
          return precoMedio > 0 && valorPorCota12m > 0 ? (valorPorCota12m / precoMedio) * 100 : null
        }

        // Top 5 ações (em carteira) com maior Div. 12m / Preço Médio, entre as que estão
        // sendo negociadas abaixo do preço médio de compra (preço atual < preço médio)
        const acoesRecomendadas = []
        posicaoAtualPorAtivo.forEach((posicaoAtual, ativoNome) => {
          if (posicaoAtual.classe !== 'ACAO' || !(posicaoAtual.quantidade > 0)) return

          const precoAtual = posicaoAtual.valor / posicaoAtual.quantidade
          if (!(precoAtual < posicaoAtual.precoMedio)) return

          acoesRecomendadas.push({
            ativo: ativoNome,
            precoMedio: posicaoAtual.precoMedio,
            precoAtual,
            recebidoPorCota12m: valorPorCotaUltimos12mPorAtivo.get(ativoNome) || 0,
            percentualSobrePreco: percentualUltimos12m(ativoNome, posicaoAtual),
          })
        })

        acoesRecomendadas.sort((a, b) => (b.percentualSobrePreco ?? -1) - (a.percentualSobrePreco ?? -1))

        // Top 5 ações (em carteira) com menor Div. 12m / Preço Médio
        const acoesMenorYield = []
        posicaoAtualPorAtivo.forEach((posicaoAtual, ativoNome) => {
          if (posicaoAtual.classe !== 'ACAO' || !(posicaoAtual.quantidade > 0)) return

          const ultimoDividendo = ultimoDividendoPorAtivo.get(ativoNome)
          const percentualSobrePreco = percentualUltimos12m(ativoNome, posicaoAtual)

          acoesMenorYield.push({
            ativo: ativoNome,
            ultimoPagamentoData: ultimoDividendo ? ultimoDividendo.data : null,
            precoMedio: posicaoAtual.precoMedio,
            recebidoPorCota12m: valorPorCotaUltimos12mPorAtivo.get(ativoNome) || 0,
            percentualSobrePreco,
          })
        })

        // Quem nunca pagou nos últimos 12 meses (percentual null) entra como 0%, no fim da lista
        acoesMenorYield.sort((a, b) => {
          const pa = a.percentualSobrePreco ?? 0
          const pb = b.percentualSobrePreco ?? 0
          if (pa !== pb) return pa - pb
          return a.ativo.localeCompare(b.ativo)
        })

        const yieldData = months.map((month) => {
          const monthEnd = new Date(month.year, month.month + 1, 1)

          const dividendosDoMes = dividendos.filter((div) => {
            const divDate = new Date(`${div.data}T00:00:00`)
            return divDate.getFullYear() === month.year && divDate.getMonth() === month.month
          })

          const totalDividendosDoMes = dividendosDoMes.reduce(
            (sum, div) => sum + toNumber(div.valor),
            0
          )

          let patrimonioCarteira = 0
          posicoesPorAtivo.forEach((historico) => {
            const posicaoMaisRecente = [...historico]
              .reverse()
              .find((item) => item.data < monthEnd)

            if (posicaoMaisRecente) {
              patrimonioCarteira += posicaoMaisRecente.valor
            }
          })

          return {
            label: month.label,
            yield: (() => {
              if (patrimonioCarteira <= 0) return 0
              const taxaMensal = totalDividendosDoMes / patrimonioCarteira
              const taxaAnual = Math.pow(1 + taxaMensal, 12) - 1
              return taxaAnual * 100
            })(),
          }
        })

        const yieldMovingAverage12m = yieldData.map((_, idx) => {
          const start = Math.max(0, idx - 11)
          const window = yieldData.slice(start, idx + 1)
          const total = window.reduce((sum, item) => sum + item.yield, 0)
          return total / window.length
        })

        // Média móvel de 12 meses considerando apenas os meses já existentes até cada ponto
        const movingAverage12m = months.map((_, idx) => {
          const start = Math.max(0, idx - 11)
          const window = months.slice(start, idx + 1)
          const total = window.reduce((sum, m) => sum + m.total, 0)
          return total / window.length
        })

        setChartData({
          labels: months.map((m) => m.label),
          datasets: [
            {
              type: 'line',
              label: 'Média móvel 12m',
              data: movingAverage12m,
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              borderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.25,
              yAxisID: 'y',
            },
            {
              type: 'bar',
              label: 'Dividendos (R$)',
              data: months.map((m) => m.total),
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1,
            },
            
          ],
        })
        setYieldChartData({
          labels: yieldData.map((item) => item.label),
          datasets: [
            {
              label: 'Dividend Yield anualizado (média móvel 12m) (%)',
              data: yieldMovingAverage12m,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.3,
              fill: true,
            },
            {
              label: 'Meta (6%)',
              data: yieldData.map(() => 6),
              borderColor: '#f43f5e',
              backgroundColor: '#f43f5e',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0,
              borderDash: [6, 6],
              fill: false,
            },
          ],
        })
        setRecomendacoesCompra(acoesRecomendadas.slice(0, 5))
        setMenorYield12m(acoesMenorYield.filter((item) => (item.percentualSobrePreco ?? 0) < 6).slice(0, 5))
      })
      .catch(() => {
        setError('Erro ao carregar dividendos.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [refreshKey, externalRefreshKey])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#d1d5db',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
          callback: (value) => `R$ ${value.toLocaleString('pt-BR')}`,
        },
      },
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
        },
      },
    },
  }

  const yieldChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#d1d5db',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
          callback: (value) => `${Number(value).toFixed(2)}%`,
        },
      },
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
        },
      },
    },
  }

  if (loading) return <div className="p-4 text-white">Carregando dividendos...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Novo dividendo
        </button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Dividendos - Últimos 12 meses</h2>
          <p className="mt-1 text-sm text-gray-400">
            Histórico consolidado dos pagamentos recebidos ao longo do tempo.
          </p>
        </div>

        <div className="h-96 w-full">
          {chartData ? <Bar data={chartData} options={chartOptions} /> : null}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Dividend Yield anualizado da carteira (MM 12m)</h2>
          <p className="mt-1 text-sm text-gray-400">
            Série exibida como média móvel de 12 meses do Dividend Yield anualizado, onde taxa anual = (1 + taxa mensal)^12 - 1.
          </p>
        </div>

        <div className="h-96 w-full">
          {yieldChartData ? <Line data={yieldChartData} options={yieldChartOptions} /> : null}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Recomendação de compra</h2>
            <p className="mt-1 text-sm text-gray-400">
              Top 5 ações em carteira com maior Div. 12m / Preço Médio, entre as que estão sendo
              negociadas abaixo do seu preço médio de compra.
            </p>
          </div>
          <div className="text-sm text-gray-400">
            {recomendacoesCompra.length} {recomendacoesCompra.length === 1 ? 'ação' : 'ações'} abaixo do preço médio
          </div>
        </div>

        {recomendacoesCompra.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Ação
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Preço Médio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Preço Atual
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Recebido por Ação (12m)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Div. 12m / Preço Médio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-black">
                {recomendacoesCompra.map((item, index) => (
                  <tr key={item.ativo} className="hover:bg-gray-950/60">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">#{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{item.ativo}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-200">
                      {currencyFormatter.format(item.precoMedio)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-400">
                      {currencyFormatter.format(item.precoAtual)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {currencyFormatter.format(item.recebidoPorCota12m)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {percentFormatter(item.percentualSobrePreco)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-700 px-4 py-8 text-center text-sm text-gray-400">
            Nenhuma ação em carteira está abaixo do preço médio no momento.
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Top 5 ações com Div. 12m / Preço Médio abaixo de 6%</h2>
            <p className="mt-1 text-sm text-gray-400">
              Entre as ações em carteira, até 5 com menor yield sobre o preço médio abaixo de 6% nos últimos 12 meses.
            </p>
          </div>
          <div className="text-sm text-gray-400">
            {menorYield12m.length} {menorYield12m.length === 1 ? 'ação' : 'ações'} abaixo de 6%
          </div>
        </div>

        {menorYield12m.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Ação
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Última vez que pagou
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Preço Médio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Recebido por Ação (12m)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Div. 12m / Preço Médio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-black">
                {menorYield12m.map((item, index) => (
                  <tr key={item.ativo} className="hover:bg-gray-950/60">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">#{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{item.ativo}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-200">
                      {item.ultimoPagamentoData ? item.ultimoPagamentoData.toLocaleDateString('pt-BR') : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-200">
                      {currencyFormatter.format(item.precoMedio)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {currencyFormatter.format(item.recebidoPorCota12m)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {percentFormatter(item.percentualSobrePreco)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-700 px-4 py-8 text-center text-sm text-gray-400">
            Nenhuma ação em carteira com yield abaixo de 6%.
          </div>
        )}
      </div>

      <DividendoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleDividendoCreated}
      />
    </div>
  )
}
