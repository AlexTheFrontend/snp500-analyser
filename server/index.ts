import express from 'express'
import cors from 'cors'
import YahooFinance from 'yahoo-finance2'
import { computeScore, getRating, type StockScore } from './sp500.js'
import { scrapeSP500List } from './scrapers/sp500-list.js'
import { scrapeStockNews } from './scrapers/news.js'
import { scrapeFinvizMetrics } from './scrapers/finviz-metrics.js'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const app = express()
app.use(cors())

function safe(v: number | null | undefined): number | null {
  if (v == null || isNaN(v) || !isFinite(v)) return null
  return v
}

// --- S&P 500 List endpoint ---
app.get('/api/sp500-list', async (_req, res) => {
  try {
    const companies = await scrapeSP500List()
    const sectors = [...new Set(companies.map(c => c.sector))].sort()
    res.json({
      companies,
      count: companies.length,
      sectors,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    console.error('SP500 list failed:', err)
    res.status(500).json({ error: 'Failed to fetch S&P 500 list' })
  }
})

// --- Screener endpoint (now with pagination) ---
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
          ticker,
          name,
          sector,
          price:        safe(quote.regularMarketPrice),
          change1d:     safe(quote.regularMarketChangePercent),
          marketCap:    safe(quote.marketCap),
          pe,
          pb,
          roe,
          debtEquity,
          profitMargin,
          score,
          rating: getRating(score),
        } satisfies StockScore
      } catch {
        return null
      }
    })
  )
}

app.get('/api/screener', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize as string) || 50))
    const sectorFilter = (req.query.sector as string) || ''

    // Get the full S&P 500 list
    let allCompanies = await scrapeSP500List()

    // Apply sector filter at the list level
    if (sectorFilter && sectorFilter !== 'All') {
      allCompanies = allCompanies.filter(c => c.sector === sectorFilter)
    }

    const totalCount = allCompanies.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIdx = (page - 1) * pageSize
    const pageCompanies = allCompanies.slice(startIdx, startIdx + pageSize)

    // Fetch Yahoo data only for the current page
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
})

// --- Quote endpoint ---
app.get('/api/stock/:ticker/quote', async (req, res) => {
  const { ticker } = req.params

  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(ticker.toUpperCase()),
      yahooFinance.quoteSummary(ticker.toUpperCase(), {
        modules: [
          'summaryDetail',
          'defaultKeyStatistics',
          'financialData',
          'incomeStatementHistory',
          'cashflowStatementHistory',
          'assetProfile',
        ],
      }).catch(() => null),
    ])

    const fd = summary?.financialData
    const ks = summary?.defaultKeyStatistics
    const sd = summary?.summaryDetail
    const ap = summary?.assetProfile

    res.json({
      ticker:       quote.symbol,
      name:         quote.longName ?? quote.shortName ?? ticker,
      price:        safe(quote.regularMarketPrice),
      change1d:     safe(quote.regularMarketChangePercent),
      change1dAbs:  safe(quote.regularMarketChange),
      open:         safe(quote.regularMarketOpen),
      high52w:      safe(quote.fiftyTwoWeekHigh),
      low52w:       safe(quote.fiftyTwoWeekLow),
      volume:       quote.regularMarketVolume ?? null,
      avgVolume:    quote.averageDailyVolume10Day ?? null,
      marketCap:    safe(quote.marketCap),
      exchange:     quote.fullExchangeName ?? null,
      currency:     quote.currency ?? 'USD',
      sector:       ap?.sector ?? null,
      industry:     ap?.industry ?? null,
      description:  ap?.longBusinessSummary ?? null,
      pe:           safe(sd?.trailingPE ?? quote.trailingPE),
      forwardPe:    safe(sd?.forwardPE ?? quote.forwardPE),
      pb:           safe(ks?.priceToBook),
      ps:           safe((ks as any)?.priceToSalesTrailing12Months ?? (sd as any)?.priceToSalesTrailing12Months),
      peg:          safe(ks?.pegRatio),
      ev:           safe(ks?.enterpriseValue),
      evEbitda:     safe(ks?.enterpriseToEbitda),
      roe:          safe(fd?.returnOnEquity),
      roa:          safe(fd?.returnOnAssets),
      profitMargin: safe(fd?.profitMargins),
      grossMargin:  safe(fd?.grossMargins),
      ebitdaMargin: safe(fd?.ebitdaMargins),
      debtEquity:   safe(fd?.debtToEquity != null ? fd.debtToEquity / 100 : null),
      currentRatio: safe(fd?.currentRatio),
      quickRatio:   safe(fd?.quickRatio),
      revenueGrowth:  safe(fd?.revenueGrowth),
      earningsGrowth: safe(fd?.earningsGrowth),
      revenue:      safe(fd?.totalRevenue),
      ebitda:       safe(fd?.ebitda),
      eps:          safe(ks?.trailingEps),
      forwardEps:   safe(ks?.forwardEps),
      dividendYield:    safe(sd?.dividendYield),
      payoutRatio:      safe((ks as any)?.payoutRatio),
      targetMeanPrice:  safe(fd?.targetMeanPrice),
      recommendation:   fd?.recommendationKey ?? null,
      numberOfAnalysts: fd?.numberOfAnalystOpinions ?? null,
      beta: safe(ks?.beta ?? sd?.beta),
    })
  } catch (err) {
    console.error(`Quote fetch failed for ${ticker}:`, err)
    res.status(500).json({ error: 'Failed to fetch quote' })
  }
})

// --- News endpoint ---
app.get('/api/stock/:ticker/news', async (req, res) => {
  const { ticker } = req.params
  try {
    const result = await scrapeStockNews(ticker)
    res.json(result)
  } catch (err) {
    console.error(`News fetch failed for ${ticker}:`, err)
    res.json({ news: [], overallSentiment: { score: 0, label: 'Neutral', positive: 0, negative: 0, neutral: 0 } })
  }
})

// --- Finviz Metrics endpoint ---
app.get('/api/stock/:ticker/metrics', async (req, res) => {
  const { ticker } = req.params
  try {
    const metrics = await scrapeFinvizMetrics(ticker)
    res.json({ metrics })
  } catch (err) {
    console.error(`Metrics fetch failed for ${ticker}:`, err)
    res.json({ metrics: null })
  }
})

// --- History endpoint ---
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const PERIOD_MAP: Record<string, { period1: string; interval: '1d' | '1wk' | '1mo' }> = {
  '1m':  { period1: daysAgo(30),   interval: '1d' },
  '3m':  { period1: daysAgo(90),   interval: '1d' },
  '6m':  { period1: daysAgo(180),  interval: '1d' },
  '1y':  { period1: daysAgo(365),  interval: '1d' },
  '5y':  { period1: daysAgo(1825), interval: '1wk' },
  '10y': { period1: daysAgo(3650), interval: '1mo' },
}

app.get('/api/stock/:ticker/history', async (req, res) => {
  const { ticker } = req.params
  const period = (req.query.period as string) ?? '1y'
  const config = PERIOD_MAP[period] ?? PERIOD_MAP['1y']

  try {
    const result = await yahooFinance.chart(ticker.toUpperCase(), {
      period1: config.period1,
      interval: config.interval,
    })

    const data = (result.quotes ?? []).map((row) => ({
      time: row.date.toISOString().split('T')[0],
      open:   Number(row.open?.toFixed(2)  ?? 0),
      high:   Number(row.high?.toFixed(2)  ?? 0),
      low:    Number(row.low?.toFixed(2)   ?? 0),
      close:  Number(row.close?.toFixed(2) ?? 0),
      volume: row.volume ?? 0,
    }))

    res.json({ data })
  } catch (err) {
    console.error(`History fetch failed for ${ticker}:`, err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
