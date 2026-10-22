import { timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from './_types.js'
import { getServerEnv } from './_env.js'

function equal(actual: string, expected: string) {
  const a = Buffer.from(actual), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Owner-only API: prevents anonymous AI spend and shared-token publishing. */
export function requireOperator(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'private, no-store')
  const user = getServerEnv('BASIC_AUTH_USER'), password = getServerEnv('BASIC_AUTH_PASSWORD')
  if (!user || !password) {
    response.status(503).json({ error: 'Operator authentication is not configured.' })
    return false
  }
  const auth = request.headers.authorization ?? ''
  const decoded = auth.startsWith('Basic ') ? Buffer.from(auth.slice(6), 'base64').toString() : ''
  const separator = decoded.indexOf(':')
  const userOk = separator >= 0 && equal(decoded.slice(0, separator), user)
  const passwordOk = separator >= 0 && equal(decoded.slice(separator + 1), password)
  if (!userOk || !passwordOk) {
    response.setHeader('WWW-Authenticate', 'Basic realm="reBlock operator", charset="UTF-8"')
    response.status(401).json({ error: 'Operator authentication required.' })
    return false
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const scheme = process.env.VERCEL || request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
    const origin = request.headers.origin
    if ((origin && origin !== `${scheme}://${request.headers.host}`) ||
      (!origin && request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) {
      response.status(403).json({ error: 'Cross-origin writes are not allowed.' })
      return false
    }
  }
  return true
}

/** No server-side fetch of supplied links: Are.na handles link previews. */
export function publicSourceUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
    const host = url.hostname.toLowerCase()
    if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') ||
      host.endsWith('.internal') || host.endsWith('.test') ||
      /^[\d.]+$/.test(host) || host.includes(':') || host.includes('[')) return false
    return true
  } catch { return false }
}
