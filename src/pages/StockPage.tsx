import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StockChart from '../components/StockChart'
import FundamentalsPanel from '../components/FundamentalsPanel'
import { ArrowLeft, TrendingUp, TrendingDown, Loader } from 'lucide-react'
import clsx from 'clsx'

function fmtLarge(v: number | null): string {
  if (v == null) return '\u2014'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(0)}`
}

export default function StockPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    fetch(`/api/stock/${ticker}/quote`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] gap-2 text-text-secondary text-sm">
      <Loader size={16} className="animate-spin text-accent-green" />
      Loading {ticker}...
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-accent-red text-sm">Could not load data for {ticker}</div>
      <button onClick={() => navigate(-1)} className="text-text-secondary text-xs hover:text-text-primary flex items-center gap-1">
        <ArrowLeft size={12} /> Go back
      </button>
    </div>
  )

  const positive = (data.change1d ?? 0) >= 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-3xl font-700 text-text-primary">{data.ticker}</h1>
            {data.exchange && (
              <span className="text-xs text-text-tertiary border border-bg-border px-2 py-0.5 rounded">
                {data.exchange}
              </span>
            )}
          </div>
          <div className="text-text-secondary text-sm">{data.name}</div>
          {data.sector && (
            <div className="flex gap-2 mt-1.5">
              <span className="text-xs text-text-tertiary bg-bg-elevated border border-bg-border px-2 py-0.5 rounded">
                {data.sector}
              </span>
              {data.industry && (
                <span className="text-xs text-text-tertiary bg-bg-elevated border border-bg-border px-2 py-0.5 rounded">
                  {data.industry}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="font-display text-4xl font-700 text-text-primary metric-val">
            ${data.price?.toFixed(2) ?? '\u2014'}
          </div>
          <div className={clsx(
            'flex items-center justify-end gap-1.5 text-sm font-mono mt-1',
            positive ? 'text-accent-green' : 'text-accent-red'
          )}>
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {positive ? '+' : ''}{data.change1dAbs?.toFixed(2) ?? '0.00'}&nbsp;
            ({positive ? '+' : ''}{data.change1d?.toFixed(2) ?? '0.00'}%)
          </div>
        </div>
      </div>

      {/* Quick stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Market Cap',  value: fmtLarge(data.marketCap) },
          { label: '52W High',    value: `$${data.high52w?.toFixed(2) ?? '\u2014'}` },
          { label: '52W Low',     value: `$${data.low52w?.toFixed(2) ?? '\u2014'}` },
          { label: 'Avg Volume',  value: data.avgVolume ? `${(data.avgVolume / 1e6).toFixed(1)}M` : '\u2014' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-card border border-bg-border rounded-xl px-4 py-3">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{label}</div>
            <div className="text-sm font-mono font-500 text-text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* Main layout: chart + fundamentals */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <StockChart ticker={ticker!} />

          {/* Description */}
          {data.description && (
            <div className="bg-bg-card border border-bg-border rounded-xl p-4">
              <h3 className="text-xs font-display font-600 text-text-tertiary uppercase tracking-widest mb-2">
                About
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-6">
                {data.description}
              </p>
            </div>
          )}
        </div>

        {/* Fundamentals sidebar */}
        <div>
          <FundamentalsPanel data={data} />
        </div>
      </div>
    </div>
  )
}
