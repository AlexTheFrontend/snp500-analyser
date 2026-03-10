import * as cheerio from 'cheerio'
import { fetchWithRetry } from '../lib/scraper-base.js'
import { cache, TTL } from '../lib/cache.js'

export interface FinvizMetrics {
  // Ownership & Short Interest
  insiderOwnership: number | null
  insiderTransactions: number | null
  institutionalOwnership: number | null
  institutionalTransactions: number | null
  shortFloat: number | null
  shortRatio: number | null

  // Analyst
  analystTargetPrice: number | null
  analystRecommendation: number | null

  // Earnings
  earningsDate: string | null

  // Performance
  perfWeek: number | null
  perfMonth: number | null
  perfQuarter: number | null
  perfHalfYear: number | null
  perfYear: number | null
  perfYTD: number | null

  // Volatility
  volatilityWeek: number | null
  volatilityMonth: number | null

  // Technical
  sma20: number | null
  sma50: number | null
  sma200: number | null
  rsi14: number | null
}

function parsePercent(s: string): number | null {
  if (!s || s === '-') return null
  const cleaned = s.replace('%', '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n / 100
}

function parseNumber(s: string): number | null {
  if (!s || s === '-') return null
  const n = parseFloat(s.replace(',', ''))
  return isNaN(n) ? null : n
}

export async function scrapeFinvizMetrics(ticker: string): Promise<FinvizMetrics | null> {
  const cacheKey = `finviz:${ticker.toUpperCase()}`
  const cached = cache.get<FinvizMetrics>(cacheKey)
  if (cached) return cached

  try {
    const url = `https://finviz.com/quote.ashx?t=${ticker.toUpperCase()}&ty=c&p=d&b=1`
    const html = await fetchWithRetry(url)
    const $ = cheerio.load(html)

    // Parse the snapshot metrics table
    const metricsMap = new Map<string, string>()
    $('table.snapshot-table2 tr').each((_, row) => {
      const cells = $(row).find('td')
      for (let i = 0; i < cells.length - 1; i += 2) {
        const label = $(cells[i]).text().trim()
        const value = $(cells[i + 1]).text().trim()
        if (label) metricsMap.set(label, value)
      }
    })

    const metrics: FinvizMetrics = {
      insiderOwnership: parsePercent(metricsMap.get('Insider Own') ?? ''),
      insiderTransactions: parsePercent(metricsMap.get('Insider Trans') ?? ''),
      institutionalOwnership: parsePercent(metricsMap.get('Inst Own') ?? ''),
      institutionalTransactions: parsePercent(metricsMap.get('Inst Trans') ?? ''),
      shortFloat: parsePercent(metricsMap.get('Short Float') ?? ''),
      shortRatio: parseNumber(metricsMap.get('Short Ratio') ?? ''),
      analystTargetPrice: parseNumber(metricsMap.get('Target Price') ?? ''),
      analystRecommendation: parseNumber(metricsMap.get('Recom') ?? ''),
      earningsDate: metricsMap.get('Earnings') || null,
      perfWeek: parsePercent(metricsMap.get('Perf Week') ?? ''),
      perfMonth: parsePercent(metricsMap.get('Perf Month') ?? ''),
      perfQuarter: parsePercent(metricsMap.get('Perf Quarter') ?? ''),
      perfHalfYear: parsePercent(metricsMap.get('Perf Half Y') ?? ''),
      perfYear: parsePercent(metricsMap.get('Perf Year') ?? ''),
      perfYTD: parsePercent(metricsMap.get('Perf YTD') ?? ''),
      volatilityWeek: parsePercent((metricsMap.get('Volatility') ?? '').split(' ')[0] ?? ''),
      volatilityMonth: parsePercent((metricsMap.get('Volatility') ?? '').split(' ')[1] ?? ''),
      sma20: parsePercent(metricsMap.get('SMA20') ?? ''),
      sma50: parsePercent(metricsMap.get('SMA50') ?? ''),
      sma200: parsePercent(metricsMap.get('SMA200') ?? ''),
      rsi14: parseNumber(metricsMap.get('RSI (14)') ?? ''),
    }

    cache.set(cacheKey, metrics, TTL.FINVIZ_METRICS)
    return metrics
  } catch (err) {
    console.error(`Failed to scrape Finviz metrics for ${ticker}:`, err)
    return null
  }
}
