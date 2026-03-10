import * as cheerio from 'cheerio'
import { fetchWithRetry } from '../lib/scraper-base.js'
import { cache, TTL } from '../lib/cache.js'

export interface SP500Company {
  ticker: string
  name: string
  sector: string
  subIndustry: string
}

const CACHE_KEY = 'sp500:constituents'
const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'

// Fallback list (current 44 stocks) used when scraping fails
const FALLBACK_LIST: SP500Company[] = [
  { ticker: 'BRK-B', name: 'Berkshire Hathaway', sector: 'Financials', subIndustry: 'Multi-Sector Holdings' },
  { ticker: 'JPM',   name: 'JPMorgan Chase',     sector: 'Financials', subIndustry: 'Diversified Banks' },
  { ticker: 'BAC',   name: 'Bank of America',    sector: 'Financials', subIndustry: 'Diversified Banks' },
  { ticker: 'WFC',   name: 'Wells Fargo',        sector: 'Financials', subIndustry: 'Diversified Banks' },
  { ticker: 'USB',   name: 'US Bancorp',         sector: 'Financials', subIndustry: 'Regional Banks' },
  { ticker: 'GS',    name: 'Goldman Sachs',      sector: 'Financials', subIndustry: 'Investment Banking' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',  sector: 'Health Care', subIndustry: 'Pharmaceuticals' },
  { ticker: 'ABT',   name: 'Abbott Labs',        sector: 'Health Care', subIndustry: 'Health Care Equipment' },
  { ticker: 'UNH',   name: 'UnitedHealth',       sector: 'Health Care', subIndustry: 'Managed Health Care' },
  { ticker: 'CVS',   name: 'CVS Health',         sector: 'Health Care', subIndustry: 'Health Care Services' },
  { ticker: 'MRK',   name: 'Merck',              sector: 'Health Care', subIndustry: 'Pharmaceuticals' },
  { ticker: 'PFE',   name: 'Pfizer',             sector: 'Health Care', subIndustry: 'Pharmaceuticals' },
  { ticker: 'KO',    name: 'Coca-Cola',          sector: 'Consumer Staples', subIndustry: 'Soft Drinks' },
  { ticker: 'PEP',   name: 'PepsiCo',            sector: 'Consumer Staples', subIndustry: 'Soft Drinks' },
  { ticker: 'WMT',   name: 'Walmart',            sector: 'Consumer Staples', subIndustry: 'Hypermarkets' },
  { ticker: 'PG',    name: 'Procter & Gamble',   sector: 'Consumer Staples', subIndustry: 'Household Products' },
  { ticker: 'CL',    name: 'Colgate-Palmolive',  sector: 'Consumer Staples', subIndustry: 'Household Products' },
  { ticker: 'KHC',   name: 'Kraft Heinz',        sector: 'Consumer Staples', subIndustry: 'Packaged Foods' },
  { ticker: 'MCD',   name: "McDonald's",         sector: 'Consumer Discretionary', subIndustry: 'Restaurants' },
  { ticker: 'NKE',   name: 'Nike',               sector: 'Consumer Discretionary', subIndustry: 'Footwear' },
  { ticker: 'LOW',   name: "Lowe's",             sector: 'Consumer Discretionary', subIndustry: 'Home Improvement' },
  { ticker: 'HD',    name: 'Home Depot',         sector: 'Consumer Discretionary', subIndustry: 'Home Improvement' },
  { ticker: 'COST',  name: 'Costco',             sector: 'Consumer Discretionary', subIndustry: 'Hypermarkets' },
  { ticker: 'XOM',   name: 'ExxonMobil',         sector: 'Energy', subIndustry: 'Integrated Oil & Gas' },
  { ticker: 'CVX',   name: 'Chevron',            sector: 'Energy', subIndustry: 'Integrated Oil & Gas' },
  { ticker: 'COP',   name: 'ConocoPhillips',     sector: 'Energy', subIndustry: 'Oil & Gas Exploration' },
  { ticker: 'CAT',   name: 'Caterpillar',        sector: 'Industrials', subIndustry: 'Construction Machinery' },
  { ticker: 'DE',    name: 'Deere & Co',         sector: 'Industrials', subIndustry: 'Agricultural Machinery' },
  { ticker: 'MMM',   name: '3M',                 sector: 'Industrials', subIndustry: 'Industrial Conglomerates' },
  { ticker: 'HON',   name: 'Honeywell',          sector: 'Industrials', subIndustry: 'Industrial Conglomerates' },
  { ticker: 'GE',    name: 'GE Aerospace',       sector: 'Industrials', subIndustry: 'Aerospace & Defense' },
  { ticker: 'AAPL',  name: 'Apple',              sector: 'Information Technology', subIndustry: 'Technology Hardware' },
  { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Information Technology', subIndustry: 'Systems Software' },
  { ticker: 'GOOGL', name: 'Alphabet',           sector: 'Communication Services', subIndustry: 'Interactive Media' },
  { ticker: 'INTC',  name: 'Intel',              sector: 'Information Technology', subIndustry: 'Semiconductors' },
  { ticker: 'CSCO',  name: 'Cisco',              sector: 'Information Technology', subIndustry: 'Networking Equipment' },
  { ticker: 'IBM',   name: 'IBM',                sector: 'Information Technology', subIndustry: 'IT Consulting' },
  { ticker: 'LIN',   name: 'Linde',              sector: 'Materials', subIndustry: 'Industrial Gases' },
  { ticker: 'NEM',   name: 'Newmont',            sector: 'Materials', subIndustry: 'Gold' },
  { ticker: 'NEE',   name: 'NextEra Energy',     sector: 'Utilities', subIndustry: 'Electric Utilities' },
  { ticker: 'D',     name: 'Dominion Energy',    sector: 'Utilities', subIndustry: 'Electric Utilities' },
  { ticker: 'VZ',    name: 'Verizon',            sector: 'Communication Services', subIndustry: 'Integrated Telecom' },
  { ticker: 'T',     name: 'AT&T',               sector: 'Communication Services', subIndustry: 'Integrated Telecom' },
  { ticker: 'CMCSA', name: 'Comcast',            sector: 'Communication Services', subIndustry: 'Cable & Satellite' },
]

function normalizeTicker(ticker: string): string {
  return ticker.replace(/\./g, '-').trim()
}

export async function scrapeSP500List(): Promise<SP500Company[]> {
  const cached = cache.get<SP500Company[]>(CACHE_KEY)
  if (cached) return cached

  try {
    const html = await fetchWithRetry(WIKIPEDIA_URL)
    const $ = cheerio.load(html)

    const companies: SP500Company[] = []
    const table = $('#constituents')

    table.find('tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 5) return

      const ticker = normalizeTicker($(cells[0]).text())
      const name = $(cells[1]).text().trim()
      const sector = $(cells[2]).text().trim()
      const subIndustry = $(cells[3]).text().trim()

      if (ticker && name) {
        companies.push({ ticker, name, sector, subIndustry })
      }
    })

    if (companies.length < 400) {
      console.warn(`Wikipedia scrape returned only ${companies.length} companies, using fallback`)
      cache.set(CACHE_KEY, FALLBACK_LIST, TTL.SP500_LIST)
      return FALLBACK_LIST
    }

    cache.set(CACHE_KEY, companies, TTL.SP500_LIST)
    console.log(`Scraped ${companies.length} S&P 500 companies from Wikipedia`)
    return companies
  } catch (err) {
    console.error('Failed to scrape S&P 500 list:', err)
    cache.set(CACHE_KEY, FALLBACK_LIST, 5 * 60 * 1000) // cache fallback for 5 min before retrying
    return FALLBACK_LIST
  }
}
