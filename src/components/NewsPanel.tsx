import { useEffect, useState } from 'react'
import { Loader, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

interface NewsItem {
  headline: string
  source: string
  url: string
  datetime: string
  sentiment: 'positive' | 'negative' | 'neutral'
  sentimentScore: number
}

interface NewsSummary {
  news: NewsItem[]
  overallSentiment: {
    score: number
    label: string
    positive: number
    negative: number
    neutral: number
  }
}

const SENTIMENT_DOT: Record<string, string> = {
  positive: 'bg-accent-green',
  negative: 'bg-accent-red',
  neutral:  'bg-text-tertiary',
}

const SENTIMENT_BADGE: Record<string, string> = {
  Bullish: 'text-accent-green bg-accent-green/10 border-accent-green/30',
  Bearish: 'text-accent-red bg-accent-red/10 border-accent-red/30',
  Neutral: 'text-text-secondary bg-bg-elevated border-bg-border',
}

export default function NewsPanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<NewsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stock/${ticker}/news`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-xl p-4">
        <h3 className="text-xs font-display font-600 text-text-tertiary uppercase tracking-widest mb-3">
          News & Sentiment
        </h3>
        <div className="flex items-center justify-center py-6 gap-2 text-text-secondary text-xs">
          <Loader size={14} className="animate-spin text-accent-green" />
          Loading news...
        </div>
      </div>
    )
  }

  if (!data || data.news.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-xl p-4">
        <h3 className="text-xs font-display font-600 text-text-tertiary uppercase tracking-widest mb-3">
          News & Sentiment
        </h3>
        <p className="text-xs text-text-tertiary py-4 text-center">No recent news available</p>
      </div>
    )
  }

  const { overallSentiment } = data

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-display font-600 text-text-tertiary uppercase tracking-widest">
          News & Sentiment
        </h3>
        <span className={clsx(
          'text-[10px] font-mono font-600 border px-2 py-0.5 rounded-full',
          SENTIMENT_BADGE[overallSentiment.label] ?? SENTIMENT_BADGE.Neutral
        )}>
          {overallSentiment.label}
        </span>
      </div>

      {/* Sentiment summary bar */}
      <div className="flex items-center gap-3 mb-3 text-[10px] text-text-tertiary">
        <span className="text-accent-green">{overallSentiment.positive} positive</span>
        <span>{overallSentiment.neutral} neutral</span>
        <span className="text-accent-red">{overallSentiment.negative} negative</span>
      </div>

      {/* News list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {data.news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-bg-elevated/50 transition-colors group"
          >
            <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', SENTIMENT_DOT[item.sentiment])} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-secondary group-hover:text-text-primary transition-colors line-clamp-2">
                {item.headline}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                {item.source && <span>{item.source}</span>}
                {item.datetime && <span>{item.datetime}</span>}
              </div>
            </div>
            <ExternalLink size={10} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}
