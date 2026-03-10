import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, Loader, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import type { StockScore } from '../lib/sp500'

type SortKey = keyof Pick<StockScore, 'score' | 'pe' | 'pb' | 'roe' | 'debtEquity' | 'profitMargin' | 'marketCap' | 'change1d'>
type SortDir = 'asc' | 'desc'

const RATINGS = ['All', 'Strong Buy', 'Buy', 'Hold', 'Watch']

function fmt(v: number | null, d = 2): string {
  if (v == null) return '\u2014'
  return v.toFixed(d)
}
function fmtPct(v: number | null): string {
  if (v == null) return '\u2014'
  return `${(v * 100).toFixed(1)}%`
}
function fmtCap(v: number | null): string {
  if (v == null) return '\u2014'
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `${(v / 1e9).toFixed(1)}B`
  return `${(v / 1e6).toFixed(0)}M`
}

const RATING_STYLE: Record<string, string> = {
  'Strong Buy': 'text-accent-green bg-accent-green/10',
  'Buy':        'text-accent-blue  bg-accent-blue/10',
  'Hold':       'text-accent-amber bg-accent-amber/10',
  'Watch':      'text-text-secondary bg-bg-elevated',
}

function SortButton({ col, current, dir, onClick }: { col: SortKey; current: SortKey; dir: SortDir; onClick: () => void }) {
  const active = col === current
  return (
    <button onClick={onClick} className="inline-flex items-center gap-0.5 hover:text-text-primary transition-colors">
      {active ? (dir === 'desc' ? <ChevronDown size={12} className="text-accent-green" /> : <ChevronUp size={12} className="text-accent-green" />) : <ChevronDown size={12} className="opacity-30" />}
    </button>
  )
}

const PAGE_SIZE = 50

export default function ScreenerPage() {
  const [stocks, setStocks]     = useState<StockScore[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [sortKey, setSortKey]   = useState<SortKey>('score')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')
  const [sector, setSector]     = useState('All')
  const [rating, setRating]     = useState('All')
  const [minScore, setMinScore] = useState(0)
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sectors, setSectors]   = useState<string[]>([])

  // Fetch available sectors on mount
  useEffect(() => {
    fetch('/api/sp500-list')
      .then(r => r.json())
      .then(d => {
        if (d.sectors) setSectors(d.sectors)
        if (d.count) setTotalCount(d.count)
      })
      .catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
    if (sector !== 'All') params.set('sector', sector)

    fetch(`/api/screener?${params}`)
      .then(r => r.json())
      .then(d => {
        setStocks(d.stocks ?? [])
        if (d.pagination) {
          setTotalPages(d.pagination.totalPages)
          setTotalCount(d.pagination.totalCount)
        }
      })
      .catch(() => setError('Failed to load screener data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, sector])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let result = [...stocks]
    if (rating !== 'All') result = result.filter(s => s.rating === rating)
    if (minScore > 0)     result = result.filter(s => s.score >= minScore)

    result.sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const bv = b[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
    return result
  }, [stocks, rating, minScore, sortKey, sortDir])

  const ColHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort(col)}>
      <div className="flex items-center gap-1 text-[10px] text-text-tertiary uppercase tracking-wider whitespace-nowrap hover:text-text-secondary transition-colors">
        {label}
        <SortButton col={col} current={sortKey} dir={sortDir} onClick={() => toggleSort(col)} />
      </div>
    </th>
  )

  const sectorOptions = ['All', ...sectors]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs tracking-widest text-accent-green/70 uppercase mb-2">S&P 500 Universe</div>
        <h1 className="font-display text-3xl font-700 text-text-primary mb-1">Value Screener</h1>
        <p className="text-text-secondary text-sm">
          Ranked by Buffett Score — composite of P/E, P/B, ROE, debt and profit margins.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-4 mb-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Filter size={14} />
          <span className="text-xs font-mono">Filters</span>
        </div>

        <div>
          <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Sector</label>
          <select
            value={sector}
            onChange={e => { setSector(e.target.value); setPage(1) }}
            className="bg-bg-elevated border border-bg-border text-text-secondary text-xs rounded-lg px-3 py-1.5 outline-none focus:border-accent-green/40"
          >
            {sectorOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Rating</label>
          <select
            value={rating}
            onChange={e => setRating(e.target.value)}
            className="bg-bg-elevated border border-bg-border text-text-secondary text-xs rounded-lg px-3 py-1.5 outline-none focus:border-accent-green/40"
          >
            {RATINGS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Min Score</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={80} step={10} value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-24 accent-green-400"
            />
            <span className="text-xs font-mono text-text-primary">{minScore}+</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-text-secondary font-mono">{totalCount} total · {filtered.length} shown</span>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-green transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-secondary text-sm">
          <Loader size={20} className="animate-spin text-accent-green" />
          <span>Fetching data for page {page} ({PAGE_SIZE} stocks) from Yahoo Finance...</span>
          <span className="text-xs text-text-tertiary">This may take 10-20 seconds</span>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-accent-red text-sm">{error}</div>
      ) : (
        <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-bg-border bg-bg-elevated/50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] text-text-tertiary uppercase tracking-wider w-6">#</th>
                  <th className="px-3 py-2 text-left text-[10px] text-text-tertiary uppercase tracking-wider">Ticker</th>
                  <th className="px-3 py-2 text-left text-[10px] text-text-tertiary uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] text-text-tertiary uppercase tracking-wider">Sector</th>
                  <ColHeader col="score"       label="Score" />
                  <th className="px-3 py-2 text-left text-[10px] text-text-tertiary uppercase tracking-wider">Rating</th>
                  <ColHeader col="change1d"    label="1D %" />
                  <ColHeader col="marketCap"   label="Mkt Cap" />
                  <ColHeader col="pe"          label="P/E" />
                  <ColHeader col="pb"          label="P/B" />
                  <ColHeader col="roe"         label="ROE" />
                  <ColHeader col="debtEquity"  label="D/E" />
                  <ColHeader col="profitMargin" label="Margin" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border/50">
                {filtered.map((stock, i) => {
                  const positive = (stock.change1d ?? 0) >= 0
                  return (
                    <tr
                      key={stock.ticker}
                      className="hover:bg-bg-elevated/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-3 text-xs text-text-tertiary">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-3 py-3">
                        <Link to={`/stock/${stock.ticker}`} className="text-accent-green font-mono font-600 text-sm hover:underline">
                          {stock.ticker}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-text-secondary max-w-[160px] truncate">{stock.name}</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded">
                          {stock.sector.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-bg-elevated rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${stock.score}%`,
                                background: stock.score >= 80 ? '#00e5a0' : stock.score >= 60 ? '#4a9eff' : stock.score >= 40 ? '#f5a623' : '#4a5568'
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono font-600 text-text-primary">{stock.score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded', RATING_STYLE[stock.rating])}>
                          {stock.rating}
                        </span>
                      </td>
                      <td className={clsx('px-3 py-3 text-xs font-mono', positive ? 'text-accent-green' : 'text-accent-red')}>
                        {stock.change1d != null ? `${positive ? '+' : ''}${stock.change1d.toFixed(2)}%` : '\u2014'}
                      </td>
                      <td className="px-3 py-3 text-xs font-mono text-text-secondary">{fmtCap(stock.marketCap)}</td>
                      <td className={clsx('px-3 py-3 text-xs font-mono',
                        stock.pe != null && stock.pe < 15 ? 'text-accent-green' : stock.pe != null && stock.pe > 30 ? 'text-accent-red' : 'text-text-secondary'
                      )}>
                        {fmt(stock.pe, 1)}
                      </td>
                      <td className={clsx('px-3 py-3 text-xs font-mono',
                        stock.pb != null && stock.pb < 2 ? 'text-accent-green' : stock.pb != null && stock.pb > 5 ? 'text-accent-red' : 'text-text-secondary'
                      )}>
                        {fmt(stock.pb, 2)}
                      </td>
                      <td className={clsx('px-3 py-3 text-xs font-mono',
                        stock.roe != null && stock.roe > 0.15 ? 'text-accent-green' : stock.roe != null && stock.roe < 0 ? 'text-accent-red' : 'text-text-secondary'
                      )}>
                        {fmtPct(stock.roe)}
                      </td>
                      <td className={clsx('px-3 py-3 text-xs font-mono',
                        stock.debtEquity != null && stock.debtEquity < 0.5 ? 'text-accent-green' : stock.debtEquity != null && stock.debtEquity > 2 ? 'text-accent-red' : 'text-text-secondary'
                      )}>
                        {fmt(stock.debtEquity, 2)}
                      </td>
                      <td className={clsx('px-3 py-3 text-xs font-mono',
                        stock.profitMargin != null && stock.profitMargin > 0.15 ? 'text-accent-green' : stock.profitMargin != null && stock.profitMargin < 0.05 ? 'text-accent-red' : 'text-text-secondary'
                      )}>
                        {fmtPct(stock.profitMargin)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-tertiary text-sm">
              No stocks match the current filters
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-bg-border">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={clsx(
                  'flex items-center gap-1 text-xs transition-colors',
                  page <= 1 ? 'text-text-tertiary cursor-not-allowed' : 'text-text-secondary hover:text-accent-green'
                )}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (page <= 4) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = page - 3 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'w-7 h-7 text-xs rounded transition-colors',
                        pageNum === page
                          ? 'bg-accent-green/20 text-accent-green font-600'
                          : 'text-text-secondary hover:bg-bg-elevated'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={clsx(
                  'flex items-center gap-1 text-xs transition-colors',
                  page >= totalPages ? 'text-text-tertiary cursor-not-allowed' : 'text-text-secondary hover:text-accent-green'
                )}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-text-tertiary">
        <div>
          <span className="text-text-secondary mr-1">Buffett Score:</span>
          Composite of P/E (25pts) + P/B (25pts) + ROE (25pts) + Debt/Equity (25pts) + Profit Margin (25pts). Max 125, normalized to 100.
        </div>
        <div className="flex items-center gap-3">
          <span className="text-accent-green">&#9632;</span> Good value &nbsp;
          <span className="text-text-secondary">&#9632;</span> Neutral &nbsp;
          <span className="text-accent-red">&#9632;</span> Expensive/risky
        </div>
      </div>
    </div>
  )
}
