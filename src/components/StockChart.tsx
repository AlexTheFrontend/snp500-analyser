import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { BarChart2, TrendingUp, Loader } from 'lucide-react'
import clsx from 'clsx'

type Period = '1m' | '3m' | '6m' | '1y' | '5y' | '10y'
type ChartMode = 'line' | 'candle'

const PERIODS: { key: Period; label: string }[] = [
  { key: '1m',  label: '1M' },
  { key: '3m',  label: '3M' },
  { key: '6m',  label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: '5y',  label: '5Y' },
  { key: '10y', label: '10Y' },
]

interface OHLCBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Props {
  ticker: string
}

export default function StockChart({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const [period, setPeriod]   = useState<Period>('1y')
  const [mode, setMode]       = useState<ChartMode>('candle')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [data, setData]       = useState<OHLCBar[]>([])

  // Fetch price history
  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stock/${ticker}/history?period=${p}`)
      if (!res.ok) throw new Error('Fetch failed')
      const json = await res.json()
      setData(json.data ?? [])
    } catch {
      setError('Failed to load price data')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => { fetchData(period) }, [fetchData, period])

  // Init chart once
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8892a4',
      },
      grid: {
        vertLines: { color: '#1c2035' },
        horzLines: { color: '#1c2035' },
      },
      rightPriceScale: {
        borderColor: '#1c2035',
        textColor: '#8892a4',
      },
      timeScale: {
        borderColor: '#1c2035',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: '#4a5568', labelBackgroundColor: '#12151f' },
        horzLine: { color: '#4a5568', labelBackgroundColor: '#12151f' },
      },
      handleScroll: true,
      handleScale: true,
    })

    chartRef.current = chart

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // Update series when data or mode changes
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || data.length === 0) return

    // Remove old series
    if (seriesRef.current) {
      try { chart.removeSeries(seriesRef.current) } catch { /* noop */ }
      seriesRef.current = null
    }
    if (volSeriesRef.current) {
      try { chart.removeSeries(volSeriesRef.current) } catch { /* noop */ }
      volSeriesRef.current = null
    }

    if (mode === 'candle') {
      const cs = chart.addCandlestickSeries({
        upColor:        '#00e5a0',
        downColor:      '#ff3d5a',
        borderVisible:  false,
        wickUpColor:    '#00e5a0',
        wickDownColor:  '#ff3d5a',
      })
      cs.setData(data.map(d => ({ time: d.time as unknown as string, open: d.open, high: d.high, low: d.low, close: d.close })))
      seriesRef.current = cs
    } else {
      const first = data[0]?.close ?? 0
      const last  = data[data.length - 1]?.close ?? 0
      const color = last >= first ? '#00e5a0' : '#ff3d5a'

      const ls = chart.addLineSeries({
        color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: color,
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineColor: color,
        priceLineStyle: 2,
      })

      // Add area fill
      const as = chart.addAreaSeries({
        lineColor: color,
        topColor: `${color}22`,
        bottomColor: `${color}04`,
        lineWidth: 2,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      })
      as.setData(data.map(d => ({ time: d.time as unknown as string, value: d.close })))
      seriesRef.current = as as unknown as ISeriesApi<'Line'>

      ls.setData(data.map(d => ({ time: d.time as unknown as string, value: d.close })))
    }

    // Volume histogram
    const vol = chart.addHistogramSeries({
      color: '#2a3050',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })
    vol.setData(data.map(d => ({
      time: d.time as unknown as string,
      value: d.volume,
      color: d.close >= d.open ? '#00e5a022' : '#ff3d5a22',
    })))
    volSeriesRef.current = vol

    chart.timeScale().fitContent()
  }, [data, mode])

  const changePercent = data.length >= 2
    ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100
    : null

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
      {/* Chart header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={clsx(
                  'px-2.5 py-1 rounded text-xs font-mono transition-all',
                  period === key
                    ? 'bg-accent-green/15 text-accent-green'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {changePercent !== null && !loading && (
            <span className={clsx(
              'text-xs font-mono px-2 py-0.5 rounded',
              changePercent >= 0
                ? 'text-accent-green bg-accent-green/10'
                : 'text-accent-red bg-accent-red/10'
            )}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Chart mode toggle */}
        <div className="flex bg-bg-elevated border border-bg-border rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setMode('line')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all',
              mode === 'line'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <TrendingUp size={12} />
            Line
          </button>
          <button
            onClick={() => setMode('candle')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all',
              mode === 'candle'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <BarChart2 size={12} />
            OHLC
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-card/80 z-10">
            <div className="flex items-center gap-2 text-text-secondary text-xs">
              <Loader size={14} className="animate-spin text-accent-green" />
              Loading chart data...
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-accent-red text-xs">{error}</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
