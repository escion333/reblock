import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getArenaAccessToken } from '../_arenaAuth'

const ARENA_API = 'https://api.are.na'
const CACHE_TTL_MS = 180_000
const CACHE_FILE = join('/tmp', 'reblock-arena-explore-blocks.json')

type ExploreBlock = {
  id: number
  type: string
  title: string
  imageUrl?: string
  sourceUrl?: string
  arenaUrl: string
  author?: string
}

type ArenaSearchItem = {
  id?: number
  type?: string
  title?: string | null
  image?: {
    src?: string
    display?: { url?: string }
    original?: { url?: string }
  }
  source?: {
    url?: string
  }
  user?: {
    name?: string
    username?: string
    slug?: string
  }
  _links?: {
    html?: { href?: string }
    self?: { href?: string }
  }
}

type ExploreCache = {
  expiresAt: number
  blocks: ExploreBlock[]
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const forceRefresh = request.query.refresh === '1' || request.query.refresh === 'true'
  const cached = readExploreCache()
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    response.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300')
    return response.status(200).json({ blocks: cached.blocks, cached: true })
  }

  const apiKey = getArenaAccessToken(request)
  if (!apiKey) {
    return response.status(401).json({ error: 'Connect Are.na before loading live blocks.' })
  }

  const params = new URLSearchParams({
    query: '*',
    type: 'Block',
    sort: 'updated_at_desc',
    per: '24',
  })

  const result = await fetch(`${ARENA_API}/v3/search?${params.toString()}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
  })

  if (!result.ok) {
    return response.status(result.status).json({ error: 'Could not load Are.na explore blocks.' })
  }

  const payload = (await result.json()) as { data?: ArenaSearchItem[] }
  const blocks = (payload.data ?? []).map(normalizeBlock).filter((block): block is ExploreBlock =>
    Boolean(block),
  )

  writeExploreCache({
    expiresAt: Date.now() + CACHE_TTL_MS,
    blocks,
  })

  response.setHeader('Cache-Control', forceRefresh ? 'no-store' : 's-maxage=180, stale-while-revalidate=300')
  return response.status(200).json({ blocks, cached: false })
}

function readExploreCache(): ExploreCache | null {
  try {
    if (!existsSync(CACHE_FILE)) {
      return null
    }

    return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as ExploreCache
  } catch {
    return null
  }
}

function writeExploreCache(cache: ExploreCache) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8')
  } catch {
    // Cache writes are best-effort; the endpoint should still serve live data.
  }
}

function normalizeBlock(item: ArenaSearchItem): ExploreBlock | null {
  if (!item.id) {
    return null
  }

  const title = item.title?.trim() || item.type || 'Untitled block'
  const imageUrl = item.image?.src ?? item.image?.display?.url ?? item.image?.original?.url
  const arenaUrl = item._links?.html?.href ?? `https://www.are.na/block/${item.id}`

  return {
    id: item.id,
    type: item.type ?? 'Block',
    title,
    imageUrl,
    sourceUrl: item.source?.url,
    arenaUrl,
    author: item.user?.name ?? item.user?.username ?? item.user?.slug,
  }
}
