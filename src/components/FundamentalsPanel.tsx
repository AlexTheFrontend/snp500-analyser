import { computeScore, getRating } from '../lib/sp500'
import clsx from 'clsx'

interface QuoteData {
  ticker: string; name: string; price: number | null; change1d: number | null
  change1dAbs: number | null; open: number | null; high52w: number | null
  low52w: number | null; volume: number | null; avgVolume: number | null
  marketCap: number | null; sector: string | null; industry: string | null
  description: string | null; pe: number | null; forwardPe: number | null
  pb: number | null; ps: number | null; peg: number | null
  ev: number | null; evEbitda: number | null; roe: number | null
  roa: number | null; profitMargin: number | null; grossMargin: number | null
  ebitdaMargin: number | null; debtEquity: number | null; currentRatio: number | null
  quickRatio: number | null; revenueGrowth: number | null; earningsGrowth: number | null
  revenue: number | null; ebitda: number | null; eps: number | null
  forwardEps: number | null; dividendYield: number | null; payoutRatio: number | null
  targetMeanPrice: number | null; recommendation: string | null
  numberOfAnalysts: number | null; beta: number | null; currency: string
}

interface FinvizMetrics {
  insiderOwnership: number | null
  insiderTransactions: number | null
  institutionalOwnership: number | null
  institutionalTransactions: number | null
  shortFloat: number | null
  shortRatio: number | null
  analystTargetPrice: number | null
  analystRecommendation: number | null
  earningsDate: string | null
  perfWeek: number | null
  perfMonth: number | null
  perfQuarter: number | null
  perfHalfYear: number | null
  perfYear: number | null
  perfYTD: number | null
  volatilityWeek: number | null
  volatilityMonth: number | null
  sma20: number | null
  sma50: number | null
  sma200: number | null
  rsi14: number | null
}

function fmt(v: number | null, opts: Intl.NumberFormatOptions = {}): string {
  if (v == null) return '\u2014'
  return v.toLocaleString('en-US', opts)
}

function fmtPct(v: number | null): string {
  if (v == null) return '\u2014'
  return `${(v * 100).toFixed(2)}%`
}

function fmtLarge(v: number | null): string {
  if (v == null) return '\u2014'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(0)}`
}

function MetricRow({
  label, value, hint, sentiment,
}: {
  label: string
  value: string
  hint?: string
  sentiment?: 'good' | 'bad' | 'neutral'
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-bg-border/50 last:border-0 group">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        {label}
        {hint && (
          <span className="hidden group-hover:block absolute bg-bg-elevated border border-bg-border text-text-secondary text-xs px-2 py-1 rounded z-50 max-w-[160px] -translate-y-6">
            {hint}
          </span>
        )}
      </div>
      <span className={clsx(
        'text-xs font-mono font-500',
        sentiment === 'good'    ? 'text-accent-green' :
        sentiment === 'bad'     ? 'text-accent-red'   :
        'text-text-primary'
      )}>
        {value}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-4">
      <h3 className="text-xs font-display font-600 text-text-tertiary uppercase tracking-widest mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function FundamentalsPanel({ data, supplemental }: { data: QuoteData; supplemental?: FinvizMetrics | null }) {
  const score  = computeScore({ pe: data.pe, pb: data.pb, roe: data.roe, debtEquity: data.debtEquity, profitMargin: data.profitMargin })
  const rating = getRating(score)
  const ratingColors: Record<string, string> = {
    'Strong Buy': 'text-accent-green bg-accent-green/10 border-accent-green/30',
    'Buy':        'text-accent-blue  bg-accent-blue/10  border-accent-blue/30',
    'Hold':       'text-accent-amber bg-accent-amber/10 border-accent-amber/30',
    'Watch':      'text-text-secondary bg-bg-elevated   border-bg-border',
  }

  const upside = data.targetMeanPrice && data.price
    ? ((data.targetMeanPrice - data.price) / data.price) * 100
    : null

  return (
    <div className="space-y-3">
      {/* Value Score */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-display font-600 text-text-tertiary uppercase tracking-widest">
            Buffett Score
          </h3>
          <span className={clsx('text-xs font-mono font-600 border px-2.5 py-1 rounded-full', ratingColors[rating])}>
            {rating}
          </span>
        </div>
        {/* Score bar */}
        <div className="flex items-end gap-3">
          <span className="text-3xl font-display font-700 text-text-primary">{score}</span>
          <span className="text-text-tertiary text-xs mb-1">/&nbsp;100</span>
        </div>
        <div className="mt-3 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${score}%`,
              background: score >= 80 ? '#00e5a0' : score >= 60 ? '#4a9eff' : score >= 40 ? '#f5a623' : '#4a5568'
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-5 gap-px">
          {['P/E', 'P/B', 'ROE', 'D/E', 'Margin'].map(m => (
            <div key={m} className="text-center text-[9px] text-text-tertiary">{m}</div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-text-secondary leading-relaxed">
          Score is based on valuation (P/E, P/B), profitability (ROE, margins), and balance sheet health (debt/equity).
          Higher = more undervalued by Buffett&apos;s criteria.
        </p>
      </div>

      {/* Valuation */}
      <Section title="Valuation">
        <MetricRow label="P/E (Trailing)"  value={fmt(data.pe, { maximumFractionDigits: 1 })}
          sentiment={data.pe != null ? (data.pe < 15 ? 'good' : data.pe > 30 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="P/E (Forward)"   value={fmt(data.forwardPe, { maximumFractionDigits: 1 })} />
        <MetricRow label="P/B Ratio"       value={fmt(data.pb, { maximumFractionDigits: 2 })}
          sentiment={data.pb != null ? (data.pb < 2 ? 'good' : data.pb > 5 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="P/S Ratio"       value={fmt(data.ps, { maximumFractionDigits: 2 })} />
        <MetricRow label="PEG Ratio"       value={fmt(data.peg, { maximumFractionDigits: 2 })}
          sentiment={data.peg != null ? (data.peg < 1 ? 'good' : data.peg > 2 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="EV/EBITDA"       value={fmt(data.evEbitda, { maximumFractionDigits: 1 })} />
        <MetricRow label="Enterprise Val." value={fmtLarge(data.ev)} />
      </Section>

      {/* Profitability */}
      <Section title="Profitability">
        <MetricRow label="Return on Equity"  value={fmtPct(data.roe)}
          sentiment={data.roe != null ? (data.roe > 0.15 ? 'good' : data.roe < 0 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="Return on Assets"  value={fmtPct(data.roa)} />
        <MetricRow label="Profit Margin"     value={fmtPct(data.profitMargin)}
          sentiment={data.profitMargin != null ? (data.profitMargin > 0.15 ? 'good' : data.profitMargin < 0.05 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="Gross Margin"      value={fmtPct(data.grossMargin)} />
        <MetricRow label="EBITDA Margin"     value={fmtPct(data.ebitdaMargin)} />
      </Section>

      {/* Growth */}
      <Section title="Growth">
        <MetricRow label="Revenue (TTM)"    value={fmtLarge(data.revenue)} />
        <MetricRow label="Revenue Growth"   value={fmtPct(data.revenueGrowth)}
          sentiment={data.revenueGrowth != null ? (data.revenueGrowth > 0.05 ? 'good' : data.revenueGrowth < 0 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="Earnings Growth"  value={fmtPct(data.earningsGrowth)}
          sentiment={data.earningsGrowth != null ? (data.earningsGrowth > 0.05 ? 'good' : data.earningsGrowth < 0 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="EPS (TTM)"        value={fmt(data.eps,        { maximumFractionDigits: 2, style: 'currency', currency: data.currency })} />
        <MetricRow label="EPS (Forward)"    value={fmt(data.forwardEps, { maximumFractionDigits: 2, style: 'currency', currency: data.currency })} />
      </Section>

      {/* Balance Sheet */}
      <Section title="Balance Sheet">
        <MetricRow label="Debt / Equity"    value={fmt(data.debtEquity, { maximumFractionDigits: 2 })}
          sentiment={data.debtEquity != null ? (data.debtEquity < 0.5 ? 'good' : data.debtEquity > 2 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="Current Ratio"    value={fmt(data.currentRatio, { maximumFractionDigits: 2 })}
          sentiment={data.currentRatio != null ? (data.currentRatio > 1.5 ? 'good' : data.currentRatio < 1 ? 'bad' : 'neutral') : undefined} />
        <MetricRow label="Quick Ratio"      value={fmt(data.quickRatio, { maximumFractionDigits: 2 })} />
        <MetricRow label="EBITDA"           value={fmtLarge(data.ebitda)} />
      </Section>

      {/* Dividends */}
      <Section title="Income">
        <MetricRow label="Dividend Yield"   value={fmtPct(data.dividendYield)} />
        <MetricRow label="Payout Ratio"     value={fmtPct(data.payoutRatio)} />
        <MetricRow label="Beta"             value={fmt(data.beta, { maximumFractionDigits: 2 })}
          sentiment={data.beta != null ? (data.beta < 1 ? 'good' : data.beta > 1.5 ? 'bad' : 'neutral') : undefined} />
      </Section>

      {/* Analyst consensus */}
      {data.targetMeanPrice && (
        <Section title="Analyst Consensus">
          <MetricRow label="Target Price"     value={`$${data.targetMeanPrice.toFixed(2)}`} />
          <MetricRow label="Current Price"    value={`$${data.price?.toFixed(2) ?? '\u2014'}`} />
          <MetricRow label="Upside"           value={upside != null ? `${upside > 0 ? '+' : ''}${upside.toFixed(1)}%` : '\u2014'}
            sentiment={upside != null ? (upside > 10 ? 'good' : upside < -5 ? 'bad' : 'neutral') : undefined} />
          <MetricRow label="Recommendation"   value={(data.recommendation ?? '\u2014').toUpperCase()} />
          <MetricRow label="# of Analysts"    value={String(data.numberOfAnalysts ?? '\u2014')} />
        </Section>
      )}

      {/* Supplemental: Ownership & Short Interest (from Finviz) */}
      {supplemental && (supplemental.insiderOwnership != null || supplemental.institutionalOwnership != null || supplemental.shortFloat != null) && (
        <Section title="Ownership & Short Interest">
          {supplemental.insiderOwnership != null && (
            <MetricRow label="Insider Ownership" value={fmtPct(supplemental.insiderOwnership)} />
          )}
          {supplemental.insiderTransactions != null && (
            <MetricRow label="Insider Trans" value={fmtPct(supplemental.insiderTransactions)}
              sentiment={supplemental.insiderTransactions > 0 ? 'good' : supplemental.insiderTransactions < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.institutionalOwnership != null && (
            <MetricRow label="Institutional Own" value={fmtPct(supplemental.institutionalOwnership)} />
          )}
          {supplemental.institutionalTransactions != null && (
            <MetricRow label="Institutional Trans" value={fmtPct(supplemental.institutionalTransactions)}
              sentiment={supplemental.institutionalTransactions > 0 ? 'good' : supplemental.institutionalTransactions < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.shortFloat != null && (
            <MetricRow label="Short Float" value={fmtPct(supplemental.shortFloat)}
              sentiment={supplemental.shortFloat > 0.1 ? 'bad' : supplemental.shortFloat < 0.03 ? 'good' : 'neutral'} />
          )}
          {supplemental.shortRatio != null && (
            <MetricRow label="Short Ratio" value={supplemental.shortRatio.toFixed(2)}
              sentiment={supplemental.shortRatio > 5 ? 'bad' : 'neutral'} />
          )}
        </Section>
      )}

      {/* Supplemental: Performance (from Finviz) */}
      {supplemental && (supplemental.perfWeek != null || supplemental.perfMonth != null) && (
        <Section title="Performance">
          {supplemental.perfWeek != null && (
            <MetricRow label="1 Week" value={fmtPct(supplemental.perfWeek)}
              sentiment={supplemental.perfWeek > 0 ? 'good' : supplemental.perfWeek < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.perfMonth != null && (
            <MetricRow label="1 Month" value={fmtPct(supplemental.perfMonth)}
              sentiment={supplemental.perfMonth > 0 ? 'good' : supplemental.perfMonth < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.perfQuarter != null && (
            <MetricRow label="3 Months" value={fmtPct(supplemental.perfQuarter)}
              sentiment={supplemental.perfQuarter > 0 ? 'good' : supplemental.perfQuarter < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.perfHalfYear != null && (
            <MetricRow label="6 Months" value={fmtPct(supplemental.perfHalfYear)}
              sentiment={supplemental.perfHalfYear > 0 ? 'good' : supplemental.perfHalfYear < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.perfYear != null && (
            <MetricRow label="1 Year" value={fmtPct(supplemental.perfYear)}
              sentiment={supplemental.perfYear > 0 ? 'good' : supplemental.perfYear < 0 ? 'bad' : 'neutral'} />
          )}
          {supplemental.perfYTD != null && (
            <MetricRow label="YTD" value={fmtPct(supplemental.perfYTD)}
              sentiment={supplemental.perfYTD > 0 ? 'good' : supplemental.perfYTD < 0 ? 'bad' : 'neutral'} />
          )}
        </Section>
      )}

      {/* Supplemental: Technical (from Finviz) */}
      {supplemental && (supplemental.rsi14 != null || supplemental.sma20 != null) && (
        <Section title="Technical">
          {supplemental.rsi14 != null && (
            <MetricRow label="RSI (14)" value={supplemental.rsi14.toFixed(1)}
              sentiment={supplemental.rsi14 > 70 ? 'bad' : supplemental.rsi14 < 30 ? 'good' : 'neutral'} />
          )}
          {supplemental.sma20 != null && (
            <MetricRow label="SMA 20" value={fmtPct(supplemental.sma20)}
              sentiment={supplemental.sma20 > 0 ? 'good' : 'bad'} />
          )}
          {supplemental.sma50 != null && (
            <MetricRow label="SMA 50" value={fmtPct(supplemental.sma50)}
              sentiment={supplemental.sma50 > 0 ? 'good' : 'bad'} />
          )}
          {supplemental.sma200 != null && (
            <MetricRow label="SMA 200" value={fmtPct(supplemental.sma200)}
              sentiment={supplemental.sma200 > 0 ? 'good' : 'bad'} />
          )}
          {supplemental.earningsDate && (
            <MetricRow label="Earnings Date" value={supplemental.earningsDate} />
          )}
        </Section>
      )}
    </div>
  )
}
