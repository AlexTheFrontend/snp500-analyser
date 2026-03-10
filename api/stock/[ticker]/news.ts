import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scrapeStockNews } from '../../../server/scrapers/news.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { ticker } = req.query
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Missing ticker' })
  }

  try {
    const result = await scrapeStockNews(ticker)
    res.json(result)
  } catch (err) {
    console.error(`News fetch failed for ${ticker}:`, err)
    res.json({ news: [], overallSentiment: { score: 0, label: 'Neutral', positive: 0, negative: 0, neutral: 0 } })
  }
}
