import express from 'express'
import cors from 'cors'
import yahooFinance from 'yahoo-finance2'
import { SP500_VALUE_UNIVERSE, computeScore, getRating, type StockScore } from './sp500.js'

yahooFinance.suppressNotices(['yahooSurvey'])

const app = express()
app.use(cors())

function safe(v: number | null | undefined): number | null {
  if (v == null || isNaN(v) || !isFinite(v)) return null
  return v
}

// --- Screener endpoint ---
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

app.get('/api/screener', async (_req, res) => {
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
      ps:           safe(ks?.priceToSalesTrailing12Months ?? sd?.priceToSalesTrailing12Months),
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
      payoutRatio:      safe(ks?.payoutRatio),
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
    const result = await yahooFinance.historical(ticker.toUpperCase(), {
      period1: config.period1,
      interval: config.interval,
    })

    const data = result.map((row) => ({
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
