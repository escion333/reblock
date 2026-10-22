import { requireOperator } from '../../_security.js'
import type { VercelRequest, VercelResponse } from '../../_types.js'
import {
  clearArenaStateCookie,
  exchangeArenaCode,
  readArenaStateCookie,
  setArenaTokenCookie,
} from '../../_arenaAuth.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!requireOperator(request, response)) return

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const code = typeof request.query.code === 'string' ? request.query.code : ''
  const state = typeof request.query.state === 'string' ? request.query.state : ''
  const expectedState = readArenaStateCookie(request)

  if (!code || !state || !expectedState || state !== expectedState) {
    return response.status(400).send('Invalid Are.na OAuth response.')
  }

  clearArenaStateCookie(response)
  try {
    const token = await exchangeArenaCode(request, code)
    setArenaTokenCookie(response, token)
    return response.redirect(302, '/')
  } catch (error) {
    return response
      .status(500)
      .send(error instanceof Error ? error.message : 'Could not connect Are.na.')
  }
}
