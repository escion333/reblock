import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearArenaTokenCookie } from '../../_arenaAuth.js'

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  clearArenaTokenCookie(response)
  return response.redirect(302, '/')
}
