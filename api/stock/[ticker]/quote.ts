import type { VercelRequest, VercelResponse } from '@vercel/node'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

function safe(v: number | null | undefined): number | null {
  if (v == null || isNaN(v) || !isFinite(v)) return null
  return v
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { ticker } = req.query
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Missing ticker' })
  }

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
}
