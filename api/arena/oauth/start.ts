import { requireOperator } from '../../_security.js'
import type { VercelRequest, VercelResponse } from '../../_types.js'
import { createArenaAuthorizeUrl, createOAuthState, setArenaStateCookie } from '../../_arenaAuth.js'

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (!requireOperator(request, response)) return

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const state = createOAuthState()
  const authorizeUrl = createArenaAuthorizeUrl(request, state)
  if (!authorizeUrl) {
    return response.status(500).json({ error: 'ARENA_CLIENT_ID is not configured.' })
  }

  setArenaStateCookie(response, state)
  return response.redirect(302, authorizeUrl)
}
