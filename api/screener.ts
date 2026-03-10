import type { VercelRequest, VercelResponse } from '@vercel/node'
import YahooFinance from 'yahoo-finance2'
import { scrapeSP500List } from '../server/scrapers/sp500-list.js'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

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

async function fetchChunk(tickers: { ticker: string; name: string; sector: string }[]) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize as string) || 50))
    const sectorFilter = (req.query.sector as string) || ''

    let allCompanies = await scrapeSP500List()

    if (sectorFilter && sectorFilter !== 'All') {
      allCompanies = allCompanies.filter(c => c.sector === sectorFilter)
    }

    const totalCount = allCompanies.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIdx = (page - 1) * pageSize
    const pageCompanies = allCompanies.slice(startIdx, startIdx + pageSize)

    const chunkSize = Math.ceil(pageCompanies.length / 3)
    const chunks = [
      pageCompanies.slice(0, chunkSize),
      pageCompanies.slice(chunkSize, chunkSize * 2),
      pageCompanies.slice(chunkSize * 2),
    ].filter(c => c.length > 0)

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
    res.json({
      stocks: results,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    })
  } catch (err) {
    console.error('Screener failed:', err)
    res.status(500).json({ error: 'Failed to fetch screener data' })
  }
}
