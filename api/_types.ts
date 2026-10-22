import type { IncomingMessage, ServerResponse } from 'node:http'

/** The Node request/response extensions supplied by Vercel Functions. */
export type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[] | undefined>
  body?: Record<string, unknown>
}
export type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
  send(body: string): VercelResponse
  redirect(status: number, location: string): VercelResponse
}
