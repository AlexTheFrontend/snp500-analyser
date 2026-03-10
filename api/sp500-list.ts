import type { VercelRequest, VercelResponse } from '@vercel/node'
import { scrapeSP500List } from '../server/scrapers/sp500-list.js'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
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
}
