const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const domainTimestamps = new Map<string, number>()
const DOMAIN_DELAY_MS = 300

async function respectRateLimit(url: string): Promise<void> {
  const domain = new URL(url).hostname
  const lastRequest = domainTimestamps.get(domain) ?? 0
  const elapsed = Date.now() - lastRequest
  if (elapsed < DOMAIN_DELAY_MS) {
    await new Promise(r => setTimeout(r, DOMAIN_DELAY_MS - elapsed))
  }
  domainTimestamps.set(domain, Date.now())
}

export async function fetchWithRetry(
  url: string,
  retries = 2,
  timeoutMs = 10000,
): Promise<string> {
  await respectRateLimit(url)

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (err) {
      if (attempt === retries) throw err
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  throw new Error('fetchWithRetry: exhausted retries')
}
