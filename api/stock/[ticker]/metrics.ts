import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scrapeFinvizMetrics } from '../../../server/scrapers/finviz-metrics.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { ticker } = req.query
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Missing ticker' })
  }

  try {
    const metrics = await scrapeFinvizMetrics(ticker)
    res.json({ metrics })
  } catch (err) {
    console.error(`Metrics fetch failed for ${ticker}:`, err)
    res.json({ metrics: null })
  }
}
