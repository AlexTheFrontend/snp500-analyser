import * as cheerio from 'cheerio'
import Sentiment from 'sentiment'
import { fetchWithRetry } from '../lib/scraper-base.js'
import { cache, TTL } from '../lib/cache.js'

const sentiment = new Sentiment()

export interface NewsItem {
  headline: string
  source: string
  url: string
  datetime: string
  sentiment: 'positive' | 'negative' | 'neutral'
  sentimentScore: number
}

export interface NewsSummary {
  news: NewsItem[]
  overallSentiment: {
    score: number
    label: string
    positive: number
    negative: number
    neutral: number
  }
}

function classifySentiment(score: number): 'positive' | 'negative' | 'neutral' {
  if (score > 1) return 'positive'
  if (score < -1) return 'negative'
  return 'neutral'
}

export async function scrapeStockNews(ticker: string): Promise<NewsSummary> {
  const cacheKey = `news:${ticker.toUpperCase()}`
  const cached = cache.get<NewsSummary>(cacheKey)
  if (cached) return cached

  const empty: NewsSummary = {
    news: [],
    overallSentiment: { score: 0, label: 'Neutral', positive: 0, negative: 0, neutral: 0 },
  }

  try {
    const url = `https://finviz.com/quote.ashx?t=${ticker.toUpperCase()}&ty=c&p=d&b=1`
    const html = await fetchWithRetry(url)
    const $ = cheerio.load(html)

    const newsItems: NewsItem[] = []
    let currentDate = ''

    const newsTable = $('table.fullview-news-outer')
    newsTable.find('tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 2) return

      const dateCell = $(cells[0]).text().trim()
      const linkEl = $(cells[1]).find('a.tab-link-news')
      if (!linkEl.length) return

      const headline = linkEl.text().trim()
      const newsUrl = linkEl.attr('href') ?? ''
      const sourceEl = $(cells[1]).find('span')
      const source = sourceEl.text().replace(/[()]/g, '').trim()

      // Date cell may contain full date or just time
      if (dateCell.includes('-')) {
        currentDate = dateCell
      } else if (dateCell) {
        // Time only, append to current date
        currentDate = currentDate.split(' ')[0] + ' ' + dateCell
      }

      const analysis = sentiment.analyze(headline)

      newsItems.push({
        headline,
        source,
        url: newsUrl,
        datetime: currentDate,
        sentiment: classifySentiment(analysis.score),
        sentimentScore: analysis.score,
      })
    })

    const items = newsItems.slice(0, 20)

    let positive = 0, negative = 0, neutral = 0
    let totalScore = 0
    for (const item of items) {
      totalScore += item.sentimentScore
      if (item.sentiment === 'positive') positive++
      else if (item.sentiment === 'negative') negative++
      else neutral++
    }

    const avgScore = items.length > 0 ? totalScore / items.length : 0
    const overallLabel = avgScore > 0.5 ? 'Bullish' : avgScore < -0.5 ? 'Bearish' : 'Neutral'

    const result: NewsSummary = {
      news: items,
      overallSentiment: {
        score: Math.round(avgScore * 100) / 100,
        label: overallLabel,
        positive,
        negative,
        neutral,
      },
    }

    cache.set(cacheKey, result, TTL.NEWS)
    return result
  } catch (err) {
    console.error(`Failed to scrape news for ${ticker}:`, err)
    cache.set(cacheKey, empty, 2 * 60 * 1000) // cache empty for 2 min
    return empty
  }
}
