// Curated universe of S&P 500 value stock candidates (Buffett-style)
export const SP500_VALUE_UNIVERSE = [
  // Financials
  { ticker: 'BRK-B', name: 'Berkshire Hathaway', sector: 'Financials' },
  { ticker: 'JPM',   name: 'JPMorgan Chase',     sector: 'Financials' },
  { ticker: 'BAC',   name: 'Bank of America',    sector: 'Financials' },
  { ticker: 'WFC',   name: 'Wells Fargo',        sector: 'Financials' },
  { ticker: 'USB',   name: 'US Bancorp',         sector: 'Financials' },
  { ticker: 'GS',    name: 'Goldman Sachs',      sector: 'Financials' },
  // Healthcare
  { ticker: 'JNJ',   name: 'Johnson & Johnson',  sector: 'Healthcare' },
  { ticker: 'ABT',   name: 'Abbott Labs',        sector: 'Healthcare' },
  { ticker: 'UNH',   name: 'UnitedHealth',       sector: 'Healthcare' },
  { ticker: 'CVS',   name: 'CVS Health',         sector: 'Healthcare' },
  { ticker: 'MRK',   name: 'Merck',              sector: 'Healthcare' },
  { ticker: 'PFE',   name: 'Pfizer',             sector: 'Healthcare' },
  // Consumer Staples
  { ticker: 'KO',    name: 'Coca-Cola',          sector: 'Consumer Staples' },
  { ticker: 'PEP',   name: 'PepsiCo',            sector: 'Consumer Staples' },
  { ticker: 'WMT',   name: 'Walmart',            sector: 'Consumer Staples' },
  { ticker: 'PG',    name: 'Procter & Gamble',   sector: 'Consumer Staples' },
  { ticker: 'CL',    name: 'Colgate-Palmolive',  sector: 'Consumer Staples' },
  { ticker: 'KHC',   name: 'Kraft Heinz',        sector: 'Consumer Staples' },
  // Consumer Discretionary
  { ticker: 'MCD',   name: "McDonald's",         sector: 'Consumer Discretionary' },
  { ticker: 'NKE',   name: 'Nike',               sector: 'Consumer Discretionary' },
  { ticker: 'LOW',   name: "Lowe's",             sector: 'Consumer Discretionary' },
  { ticker: 'HD',    name: 'Home Depot',         sector: 'Consumer Discretionary' },
  { ticker: 'COST',  name: 'Costco',             sector: 'Consumer Discretionary' },
  // Energy
  { ticker: 'XOM',   name: 'ExxonMobil',         sector: 'Energy' },
  { ticker: 'CVX',   name: 'Chevron',            sector: 'Energy' },
  { ticker: 'COP',   name: 'ConocoPhillips',     sector: 'Energy' },
  // Industrials
  { ticker: 'CAT',   name: 'Caterpillar',        sector: 'Industrials' },
  { ticker: 'DE',    name: 'Deere & Co',         sector: 'Industrials' },
  { ticker: 'MMM',   name: '3M',                 sector: 'Industrials' },
  { ticker: 'HON',   name: 'Honeywell',          sector: 'Industrials' },
  { ticker: 'GE',    name: 'GE Aerospace',       sector: 'Industrials' },
  // Technology
  { ticker: 'AAPL',  name: 'Apple',              sector: 'Technology' },
  { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet',           sector: 'Technology' },
  { ticker: 'INTC',  name: 'Intel',              sector: 'Technology' },
  { ticker: 'CSCO',  name: 'Cisco',              sector: 'Technology' },
  { ticker: 'IBM',   name: 'IBM',                sector: 'Technology' },
  // Materials
  { ticker: 'LIN',   name: 'Linde',              sector: 'Materials' },
  { ticker: 'NEM',   name: 'Newmont',            sector: 'Materials' },
  // Utilities
  { ticker: 'NEE',   name: 'NextEra Energy',     sector: 'Utilities' },
  { ticker: 'D',     name: 'Dominion Energy',    sector: 'Utilities' },
  // Communications
  { ticker: 'VZ',    name: 'Verizon',            sector: 'Communications' },
  { ticker: 'T',     name: 'AT&T',               sector: 'Communications' },
  { ticker: 'CMCSA', name: 'Comcast',            sector: 'Communications' },
]

export interface StockScore {
  ticker: string
  name: string
  sector: string
  price: number | null
  change1d: number | null
  marketCap: number | null
  pe: number | null
  pb: number | null
  roe: number | null
  debtEquity: number | null
  profitMargin: number | null
  score: number
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Watch'
}

function scoreMetric(value: number | null | undefined, thresholds: [number, number, number, number], higherIsBetter: boolean): number {
  if (value == null || isNaN(value)) return 0
  const [t1, t2, t3, t4] = thresholds
  if (higherIsBetter) {
    if (value >= t1) return 25
    if (value >= t2) return 18
    if (value >= t3) return 10
    if (value >= t4) return 5
    return 0
  } else {
    if (value <= t1) return 25
    if (value <= t2) return 18
    if (value <= t3) return 10
    if (value <= t4) return 5
    return 0
  }
}

export function computeScore(data: {
  pe?: number | null
  pb?: number | null
  roe?: number | null
  debtEquity?: number | null
  profitMargin?: number | null
}): number {
  const peScore    = scoreMetric(data.pe,          [8, 12, 18, 25],  false)
  const pbScore    = scoreMetric(data.pb,          [1, 2, 3, 4],    false)
  const roeScore   = scoreMetric(data.roe,         [25, 18, 12, 7], true)
  const deScore    = scoreMetric(data.debtEquity,  [0.3, 0.7, 1.2, 2], false)
  const pmScore    = scoreMetric(data.profitMargin,[0.25, 0.18, 0.12, 0.06], true)

  return Math.round(peScore + pbScore + roeScore + deScore + pmScore)
}

export function getRating(score: number): StockScore['rating'] {
  if (score >= 80) return 'Strong Buy'
  if (score >= 60) return 'Buy'
  if (score >= 40) return 'Hold'
  return 'Watch'
}
