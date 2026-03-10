import type { VercelRequest, VercelResponse } from '@vercel/node'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const SP500_VALUE_UNIVERSE = [
  { ticker: 'BRK-B', name: 'Berkshire Hathaway', sector: 'Financials' },
  { ticker: 'JPM',   name: 'JPMorgan Chase',     sector: 'Financials' },
  { ticker: 'BAC',   name: 'Bank of America',    sector: 'Financials' },
  { ticker: 'WFC',   name: 'Wells Fargo',        sector: 'Financials' },
  { ticker: 'USB',   name: 'US Bancorp',         sector: 'Financials' },
  { ticker: 'GS',    name: 'Goldman Sachs',      sector: 'Financials' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',  sector: 'Healthcare' },
  { ticker: 'ABT',   name: 'Abbott Labs',        sector: 'Healthcare' },
  { ticker: 'UNH',   name: 'UnitedHealth',       sector: 'Healthcare' },
  { ticker: 'CVS',   name: 'CVS Health',         sector: 'Healthcare' },
  { ticker: 'MRK',   name: 'Merck',              sector: 'Healthcare' },
  { ticker: 'PFE',   name: 'Pfizer',             sector: 'Healthcare' },
  { ticker: 'KO',    name: 'Coca-Cola',          sector: 'Consumer Staples' },
  { ticker: 'PEP',   name: 'PepsiCo',            sector: 'Consumer Staples' },
  { ticker: 'WMT',   name: 'Walmart',            sector: 'Consumer Staples' },
  { ticker: 'PG',    name: 'Procter & Gamble',   sector: 'Consumer Staples' },
  { ticker: 'CL',    name: 'Colgate-Palmolive',  sector: 'Consumer Staples' },
  { ticker: 'KHC',   name: 'Kraft Heinz',        sector: 'Consumer Staples' },
  { ticker: 'MCD',   name: "McDonald's",         sector: 'Consumer Discretionary' },
  { ticker: 'NKE',   name: 'Nike',               sector: 'Consumer Discretionary' },
  { ticker: 'LOW',   name: "Lowe's",             sector: 'Consumer Discretionary' },
  { ticker: 'HD',    name: 'Home Depot',         sector: 'Consumer Discretionary' },
  { ticker: 'COST',  name: 'Costco',             sector: 'Consumer Discretionary' },
  { ticker: 'XOM',   name: 'ExxonMobil',         sector: 'Energy' },
  { ticker: 'CVX',   name: 'Chevron',            sector: 'Energy' },
  { ticker: 'COP',   name: 'ConocoPhillips',     sector: 'Energy' },
  { ticker: 'CAT',   name: 'Caterpillar',        sector: 'Industrials' },
  { ticker: 'DE',    name: 'Deere & Co',         sector: 'Industrials' },
  { ticker: 'MMM',   name: '3M',                 sector: 'Industrials' },
  { ticker: 'HON',   name: 'Honeywell',          sector: 'Industrials' },
  { ticker: 'GE',    name: 'GE Aerospace',       sector: 'Industrials' },
  { ticker: 'AAPL',  name: 'Apple',              sector: 'Technology' },
  { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet',           sector: 'Technology' },
  { ticker: 'INTC',  name: 'Intel',              sector: 'Technology' },
  { ticker: 'CSCO',  name: 'Cisco',              sector: 'Technology' },
  { ticker: 'IBM',   name: 'IBM',                sector: 'Technology' },
  { ticker: 'LIN',   name: 'Linde',              sector: 'Materials' },
  { ticker: 'NEM',   name: 'Newmont',            sector: 'Materials' },
  { ticker: 'NEE',   name: 'NextEra Energy',     sector: 'Utilities' },
  { ticker: 'D',     name: 'Dominion Energy',    sector: 'Utilities' },
  { ticker: 'VZ',    name: 'Verizon',            sector: 'Communications' },
  { ticker: 'T',     name: 'AT&T',               sector: 'Communications' },
  { ticker: 'CMCSA', name: 'Comcast',            sector: 'Communications' },
]

function safe(v: number | null | undefined): number | null {
  if (v == null || isNaN(v) || !isFinite(v)) return null
  return v
}

function scoreMetric(value: number | null | undefined, thresholds: [number, number, number, number], higherIsBetter: boolean): number {
  if (value == null || isNaN(value)) return 0
  const [t1, t2, t3, t4] = thresholds
  if (higherIsBetter) {
    if (value >= t1) return 25
    if (value >= t2) return 18
    if (value >= t3) return 10
    if (value >= t4) return 5
    return 0
  } else {
    if (value <= t1) return 25
    if (value <= t2) return 18
    if (value <= t3) return 10
    if (value <= t4) return 5
    return 0
  }
}

function computeScore(data: { pe?: number | null; pb?: number | null; roe?: number | null; debtEquity?: number | null; profitMargin?: number | null }): number {
  return Math.round(
    scoreMetric(data.pe, [8, 12, 18, 25], false) +
    scoreMetric(data.pb, [1, 2, 3, 4], false) +
    scoreMetric(data.roe, [25, 18, 12, 7], true) +
    scoreMetric(data.debtEquity, [0.3, 0.7, 1.2, 2], false) +
    scoreMetric(data.profitMargin, [0.25, 0.18, 0.12, 0.06], true)
  )
}

function getRating(score: number): string {
  if (score >= 80) return 'Strong Buy'
  if (score >= 60) return 'Buy'
  if (score >= 40) return 'Hold'
  return 'Watch'
}

interface StockScore {
  ticker: string; name: string; sector: string; price: number | null
  change1d: number | null; marketCap: number | null; pe: number | null
  pb: number | null; roe: number | null; debtEquity: number | null
  profitMargin: number | null; score: number; rating: string
}

async function fetchChunk(tickers: typeof SP500_VALUE_UNIVERSE) {
  return Promise.allSettled(
    tickers.map(async ({ ticker, name, sector }) => {
      try {
        const [quote, summary] = await Promise.all([
          yahooFinance.quote(ticker),
          yahooFinance.quoteSummary(ticker, {
            modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'],
          }).catch(() => null),
        ])

        const fd = summary?.financialData
        const ks = summary?.defaultKeyStatistics
        const sd = summary?.summaryDetail

        const pe          = safe(sd?.trailingPE ?? quote.trailingPE)
        const pb          = safe(ks?.priceToBook)
        const roe         = safe(fd?.returnOnEquity)
        const debtEquity  = safe(fd?.debtToEquity != null ? fd.debtToEquity / 100 : null)
        const profitMargin = safe(fd?.profitMargins)
        const score = computeScore({ pe, pb, roe, debtEquity, profitMargin })

        return {
          ticker, name, sector,
          price:        safe(quote.regularMarketPrice),
          change1d:     safe(quote.regularMarketChangePercent),
          marketCap:    safe(quote.marketCap),
          pe, pb, roe, debtEquity, profitMargin, score,
          rating: getRating(score),
        } satisfies StockScore
      } catch {
        return null
      }
    })
  )
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const chunkSize = Math.ceil(SP500_VALUE_UNIVERSE.length / 3)
  const chunks = [
    SP500_VALUE_UNIVERSE.slice(0, chunkSize),
    SP500_VALUE_UNIVERSE.slice(chunkSize, chunkSize * 2),
    SP500_VALUE_UNIVERSE.slice(chunkSize * 2),
  ]

  const chunkResults = await Promise.all(chunks.map(fetchChunk))
  const results: StockScore[] = []

  for (const chunk of chunkResults) {
    for (const result of chunk) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      }
    }
  }

  results.sort((a, b) => b.score - a.score)
  res.json({ stocks: results })
}
