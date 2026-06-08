import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServerEnv } from './_env.js'

const ARENA_API = 'https://api.are.na'
const ARENA_AUTH_TOKEN_COOKIE = 'reblock_arena_token'
const ARENA_AUTH_STATE_COOKIE = 'reblock_arena_state'

type ArenaTokenPayload = {
  access_token?: string
  token_type?: string
  scope?: string
}

export type ArenaIdentity =
  | { authenticated: true; mode: 'oauth'; username: string; slug?: string }
  | { authenticated: true; mode: 'demo'; username: string; slug?: string }
  | { authenticated: false; mode: 'none'; connectUrl?: string }

export function getArenaAccessToken(request: VercelRequest) {
  return getCookie(request, ARENA_AUTH_TOKEN_COOKIE) ?? getArenaDemoToken()
}

export function hasArenaOAuthConfig() {
  return Boolean(getServerEnv('ARENA_CLIENT_ID') && getServerEnv('ARENA_CLIENT_SECRET'))
}

export function arenaRedirectUri(request: VercelRequest) {
  const configured = getServerEnv('ARENA_REDIRECT_URI')
  if (configured) {
    return configured
  }

  const host = request.headers['x-forwarded-host'] ?? request.headers.host
  const proto = request.headers['x-forwarded-proto'] ?? 'http'
  return `${proto}://${host}/api/arena/oauth/callback`
}

export function createArenaAuthorizeUrl(request: VercelRequest, state: string) {
  const clientId = getServerEnv('ARENA_CLIENT_ID')
  if (!clientId) {
    return null
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: arenaRedirectUri(request),
    response_type: 'code',
    scope: 'write',
    state,
  })

  return `https://www.are.na/oauth/authorize?${params.toString()}`
}

export async function exchangeArenaCode(request: VercelRequest, code: string) {
  const clientId = getServerEnv('ARENA_CLIENT_ID')
  const clientSecret = getServerEnv('ARENA_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('ARENA_CLIENT_ID and ARENA_CLIENT_SECRET are required for OAuth.')
  }

  const result = await fetch(`${ARENA_API}/v3/oauth/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: arenaRedirectUri(request),
    }),
  })

  const payload = (await result.json()) as ArenaTokenPayload & { error?: string }
  if (!result.ok || !payload.access_token) {
    throw new Error(payload.error ?? 'Could not exchange Are.na authorization code.')
  }

  return payload.access_token
}

export async function getArenaIdentity(request: VercelRequest): Promise<ArenaIdentity> {
  const oauthToken = getCookie(request, ARENA_AUTH_TOKEN_COOKIE)
  if (oauthToken) {
    const user = await fetchArenaMe(oauthToken)
    return {
      authenticated: true,
      mode: 'oauth',
      username: user.username,
      slug: user.slug,
    }
  }

  const demoToken = getArenaDemoToken()
  if (demoToken) {
    try {
      const user = await fetchArenaMe(demoToken)
      return {
        authenticated: true,
        mode: 'demo',
        username: user.username,
        slug: user.slug,
      }
    } catch {
      return {
        authenticated: true,
        mode: 'demo',
        username: 'demo',
      }
    }
  }

  return {
    authenticated: false,
    mode: 'none',
    connectUrl: hasArenaOAuthConfig() ? '/api/arena/oauth/start' : undefined,
  }
}

function getArenaDemoToken() {
  if (getServerEnv('ARENA_DEMO_MODE') !== 'true') {
    return undefined
  }

  return getServerEnv('ARENA_API_KEY')
}

export function setArenaTokenCookie(response: VercelResponse, token: string) {
  appendCookie(response, serializeCookie(ARENA_AUTH_TOKEN_COOKIE, token, true))
}

export function setArenaStateCookie(response: VercelResponse, state: string) {
  appendCookie(response, serializeCookie(ARENA_AUTH_STATE_COOKIE, state, true, 600))
}

export function readArenaStateCookie(request: VercelRequest) {
  return getCookie(request, ARENA_AUTH_STATE_COOKIE)
}

export function clearArenaStateCookie(response: VercelResponse) {
  appendCookie(response, serializeCookie(ARENA_AUTH_STATE_COOKIE, '', true, 0))
}

export function clearArenaTokenCookie(response: VercelResponse) {
  appendCookie(response, serializeCookie(ARENA_AUTH_TOKEN_COOKIE, '', true, 0))
}

export function createOAuthState() {
  return randomBytes(18).toString('base64url')
}

async function fetchArenaMe(token: string) {
  const result = await fetch(`${ARENA_API}/v3/me`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    },
  })

  if (!result.ok) {
    throw new Error('Could not read Are.na account.')
  }

  const payload = (await result.json()) as {
    username?: string
    name?: string
    slug?: string
  }

  return {
    username: payload.username ?? payload.name ?? payload.slug ?? 'Are.na',
    slug: payload.slug,
  }
}

function getCookie(request: VercelRequest, name: string) {
  const cookie = request.headers.cookie
  if (!cookie) {
    return undefined
  }

  const match = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

function serializeCookie(name: string, value: string, httpOnly: boolean, maxAge?: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    maxAge === undefined ? undefined : `Max-Age=${maxAge}`,
    httpOnly ? 'HttpOnly' : undefined,
  ].filter(Boolean)

  return parts.join('; ')
}

function appendCookie(response: VercelResponse, value: string) {
  const existing = response.getHeader('Set-Cookie')
  if (!existing) {
    response.setHeader('Set-Cookie', value)
    return
  }

  response.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, value] : [String(existing), value])
}
