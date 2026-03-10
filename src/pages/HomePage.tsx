import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

const QUICK_PICKS = [
  { ticker: 'AAPL',  label: 'Apple' },
  { ticker: 'KO',    label: 'Coca-Cola' },
  { ticker: 'JPM',   label: 'JPMorgan' },
  { ticker: 'BRK-B', label: 'Berkshire' },
  { ticker: 'JNJ',   label: 'J&J' },
  { ticker: 'XOM',   label: 'ExxonMobil' },
]

export default function HomePage() {
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSearch = useCallback((ticker: string) => {
    if (!ticker.trim()) return
    setLoading(true)
    navigate(`/stock/${ticker.trim().toUpperCase()}`)
  }, [navigate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  return (
    <div className="grid-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center text-center">

        {/* Hero */}
        <div className="mb-3 text-xs tracking-widest text-accent-green/70 uppercase font-mono">
          Warren Buffett&#8209;style analysis
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-800 text-text-primary leading-tight mb-4">
          Find <span className="text-accent-green glow-green">undervalued</span><br />
          stocks, fast.
        </h1>
        <p className="text-text-secondary text-sm md:text-base max-w-lg mb-12 leading-relaxed">
          10 years of price history, fundamental metrics, and a value scoring algorithm
          that surfaces cheap stocks before the market notices.
        </p>

        {/* Search */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="relative group">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent-green transition-colors"
            />
            <input
              type="text"
              placeholder="Enter ticker symbol — AAPL, KO, JPM..."
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              className="w-full bg-bg-card border border-bg-border focus:border-accent-green/50 rounded-xl pl-12 pr-32 py-4 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-all focus:ring-1 focus:ring-accent-green/20 font-mono"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent-green text-bg-base text-xs font-mono font-600 px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-accent-green/90 transition-all flex items-center gap-1.5"
            >
              {loading ? 'Loading...' : (<>Analyze <ArrowRight size={12} /></>)}
            </button>
          </div>
        </form>

        {/* Quick picks */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {QUICK_PICKS.map(({ ticker, label }) => (
            <button
              key={ticker}
              onClick={() => handleSearch(ticker)}
              className="flex items-center gap-2 bg-bg-card border border-bg-border hover:border-accent-green/30 hover:bg-bg-elevated rounded-lg px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-all"
            >
              <span className="text-accent-green font-600">{ticker}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-20 w-full grid grid-cols-3 gap-3">
          {[
            { label: '10-Year History',     value: 'Daily OHLCV',    icon: TrendingUp },
            { label: 'Value Metrics',       value: 'P/E \u00B7 P/B \u00B7 ROE \u00B7 FCF', icon: BarChart },
            { label: 'S&P 500 Universe',    value: '44 Value Stocks',  icon: TrendingDown },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-bg-card border border-bg-border rounded-xl p-4 text-left">
              <Icon size={16} className="text-accent-green mb-3" />
              <div className="text-xs text-text-secondary mb-1">{label}</div>
              <div className="text-xs text-text-primary font-500">{value}</div>
            </div>
          ))}
        </div>

        {/* Link to screener */}
        <a
          href="/screener"
          className="mt-8 inline-flex items-center gap-2 text-xs text-accent-green/70 hover:text-accent-green transition-colors"
        >
          View full S&P 500 value screener <ArrowRight size={12} />
        </a>
      </div>
    </div>
  )
}

function BarChart({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="8" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="6" y="4" width="3" height="11" rx="0.5" fill="currentColor" opacity="0.8" />
      <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" />
    </svg>
  )
}
