import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getArenaIdentity, hasArenaOAuthConfig } from '../_arenaAuth.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const identity = await getArenaIdentity(request)
    return response.status(200).json({
      ...identity,
      oauthAvailable: hasArenaOAuthConfig(),
    })
  } catch (error) {
    return response.status(500).json({
      authenticated: false,
      mode: 'none',
      oauthAvailable: hasArenaOAuthConfig(),
      error: error instanceof Error ? error.message : 'Could not read Are.na connection.',
    })
  }
}
