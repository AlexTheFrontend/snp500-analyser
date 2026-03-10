import type { VercelRequest, VercelResponse } from '@vercel/node'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { ticker } = req.query
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Missing ticker' })
  }

  const period = (req.query.period as string) ?? '1y'

  const PERIOD_MAP: Record<string, { period1: string; interval: '1d' | '1wk' | '1mo' }> = {
    '1m':  { period1: daysAgo(30),   interval: '1d' },
    '3m':  { period1: daysAgo(90),   interval: '1d' },
    '6m':  { period1: daysAgo(180),  interval: '1d' },
    '1y':  { period1: daysAgo(365),  interval: '1d' },
    '5y':  { period1: daysAgo(1825), interval: '1wk' },
    '10y': { period1: daysAgo(3650), interval: '1mo' },
  }

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
}
