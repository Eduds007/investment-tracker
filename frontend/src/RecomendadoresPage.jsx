import { useState, useEffect } from 'react'
import axios from 'axios'

export default function RecomendadoresPage({ refreshKey = 0 }) {
  const [valorAporte, setValorAporte] = useState('100')
  const [sugestao, setSugestao] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const [rebalanceamento, setRebalanceamento] = useState(null)
  const [loadingReb, setLoadingReb] = useState(true)

  useEffect(() => {
    axios.get('http://localhost:8000/api/rebalanceamento/')
      .then(res => res.data.success && setRebalanceamento(res.data))
      .catch(() => {})
      .finally(() => setLoadingReb(false))
  }, [refreshKey])

  const calcularSugestao = async () => {
    const valor = parseFloat(valorAporte)
    if (!valor || valor <= 0) return
    setCarregando(true)
    setErro(null)
    setSugestao(null)
    try {
      const response = await axios.get(`http://localhost:8000/api/sugestao-aporte/?valor=${valor}`)
      if (response.data.success) {
        setSugestao(response.data)
      } else {
        setErro(response.data.error || 'Erro ao calcular sugestão')
      }
    } catch (err) {
      setErro(`Erro ao conectar com o servidor: ${err.message}`)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-5">
      <h2 className="text-xl font-bold text-white">Sugestão de Aporte</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-400">Valor do Aporte (R$)</label>
          <input
            type="number"
            min="1"
            value={valorAporte}
            onChange={e => setValorAporte(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="Ex: 500"
          />
        </div>
        <button
          onClick={calcularSugestao}
          disabled={carregando || !valorAporte || parseFloat(valorAporte) <= 0}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {carregando ? 'Calculando...' : 'Calcular'}
        </button>
      </div>

      {carregando && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500"></div>
          <span className="text-sm">Analisando ativos via yfinance, aguarde...</span>
        </div>
      )}

      {erro && (
        <p className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm text-red-400">{erro}</p>
      )}

      {sugestao && (
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-green-400">
                Comprar — {sugestao.total_compras} ativo{sugestao.total_compras !== 1 ? 's' : ''}
              </h3>
              <span className="text-sm text-gray-400">
                Total: {sugestao.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {sugestao.comprar.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700 text-sm">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Ativo</th>
                      <th className="px-4 py-2 text-right">-1dp</th>
                      <th className="px-4 py-2 text-right">Yield</th>
                      <th className="px-4 py-2 text-right">Potencial</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                      <th className="px-4 py-2 text-right">%</th>
                      <th className="px-4 py-2 text-center">Carteira</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900">
                    {sugestao.comprar.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-800/50">
                        <td className="px-4 py-2 font-bold text-white">{item.ticker}</td>
                        <td className="px-4 py-2 text-right text-yellow-400">{item.minus_dp.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-right text-gray-300">{item.yield.toFixed(2)}%</td>
                        <td className={`px-4 py-2 text-right font-medium ${item.potencial >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.potencial.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-white">
                          {item.valor_sugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-400">{item.percentual.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-center text-lg">
                          {item.na_carteira ? '★' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum ativo recomendado para compra no momento.</p>
            )}
          </div>

          {sugestao.vender.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-red-400">
                Considere Vender — {sugestao.vender.length} ativo{sugestao.vender.length !== 1 ? 's' : ''} na sua carteira
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700 text-sm">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Ativo</th>
                      <th className="px-4 py-2 text-right">-1dp</th>
                      <th className="px-4 py-2 text-right">Yield</th>
                      <th className="px-4 py-2 text-right">Potencial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900">
                    {sugestao.vender.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-800/50">
                        <td className="px-4 py-2 font-bold text-white">{item.ticker}</td>
                        <td className="px-4 py-2 text-right text-red-400">{item.minus_dp.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-right text-gray-300">{item.yield.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-right text-red-400 font-medium">{item.potencial.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sugestao.vender.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum ativo da sua carteira com recomendação de venda.</p>
          )}

          <p className="text-xs text-gray-600">★ = ativo já presente na carteira</p>
        </div>
      )}

      {/* Rebalanceamento por Setor */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Rebalanceamento por Setor</h2>
          {rebalanceamento && (
            <p className="text-xs text-gray-500 mt-1">
              Referência: {new Date(rebalanceamento.data_referencia + 'T00:00:00').toLocaleDateString('pt-BR')}
              {' · '}Total: {rebalanceamento.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>

        {loadingReb && <p className="text-sm text-gray-500">Carregando posições...</p>}

        {!loadingReb && !rebalanceamento && (
          <p className="text-sm text-gray-500">Sem posições registradas para calcular o rebalanceamento.</p>
        )}

        {rebalanceamento && rebalanceamento.classes.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Setor</th>
                  <th className="px-4 py-2 text-right">Meta</th>
                  <th className="px-4 py-2 text-right">Atual</th>
                  <th className="px-4 py-2 text-right">Valor Atual</th>
                  <th className="px-4 py-2 text-right">Diferença</th>
                  <th className="px-4 py-2 text-right">R$ a mover</th>
                  <th className="px-4 py-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900">
                {rebalanceamento.classes.map((c) => {
                  const comprar = c.acao === 'COMPRAR'
                  const vender = c.acao === 'VENDER'
                  return (
                    <tr key={c.classe} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-white">{c.label}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{c.meta_pct.toFixed(1)}%</td>
                      <td className={`px-4 py-3 text-right font-medium ${comprar ? 'text-red-400' : vender ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {c.atual_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {c.atual_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${c.diff_pct > 0 ? 'text-emerald-400' : c.diff_pct < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        {c.diff_pct > 0 ? '+' : ''}{c.diff_pct.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${comprar ? 'text-emerald-400' : vender ? 'text-red-400' : 'text-gray-500'}`}>
                        {c.diff_valor > 0 ? '+' : ''}{c.diff_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {comprar && <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-300">COMPRAR</span>}
                        {vender  && <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-xs font-semibold text-red-300">VENDER</span>}
                        {!comprar && !vender && <span className="text-xs text-gray-600">OK</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
