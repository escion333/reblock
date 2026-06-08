import { ArrowUpRight, Loader2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { topics } from './data/topics'

type Step = 'idle' | 'researching' | 'publishing' | 'complete' | 'error'

type ArenaResult = {
  channelUrl: string
  channelSlug: string
  blockCount: number
  linkCount?: number
  imageCount: number
}

type ArenaIdentity = {
  authenticated: boolean
  mode: 'oauth' | 'demo' | 'none'
  username?: string
  oauthAvailable?: boolean
  error?: string
}

type ExploreBlock = {
  id: number
  type: string
  title: string
  imageUrl?: string
  sourceUrl?: string
  arenaUrl: string
  author?: string
}

const CUSTOM_TOPIC_MAX_CHARS = 80
const visibleTopics = topics.slice(0, 7)

function App() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [result, setResult] = useState<ArenaResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [arenaIdentity, setArenaIdentity] = useState<ArenaIdentity | null>(null)
  const [arenaIdentityLoading, setArenaIdentityLoading] = useState(true)
  const [exploreBlocks, setExploreBlocks] = useState<ExploreBlock[]>([])
  const [exploreError, setExploreError] = useState<string | null>(null)
  const [tickerRunId, setTickerRunId] = useState(0)
  const [customTopic, setCustomTopic] = useState('')

  const isWorking = step === 'researching' || step === 'publishing'
  const arenaReady = Boolean(arenaIdentity?.authenticated)
  const showTicker = isWorking || step === 'complete'
  const showCompleteOverlay = step === 'complete' && Boolean(result)

  useEffect(() => {
    let cancelled = false

    async function loadArenaIdentity() {
      try {
        const response = await fetch('/api/arena/me')
        const identity = await readJson(response)
        if (!cancelled) {
          setArenaIdentity(identity)
          setArenaIdentityLoading(false)
        }
      } catch {
        if (!cancelled) {
          setArenaIdentity({ authenticated: false, mode: 'none' })
          setArenaIdentityLoading(false)
        }
      }
    }

    loadArenaIdentity()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showTicker || exploreBlocks.length > 0) {
      return
    }

    let cancelled = false

    async function loadExploreBlocks() {
      try {
        const response = await fetch(`/api/arena/explore-blocks?refresh=1&run=${tickerRunId}`)
        const payload = await readJson(response)
        if (!response.ok) {
          throw new Error(payload.error ?? 'Could not load live Are.na blocks.')
        }

        if (!cancelled) {
          setExploreBlocks(payload.blocks ?? [])
          setExploreError(null)
        }
      } catch (caughtError) {
        if (!cancelled) {
          setExploreError(caughtError instanceof Error ? caughtError.message : 'Could not load live blocks.')
        }
      }
    }

    loadExploreBlocks()

    return () => {
      cancelled = true
    }
  }, [exploreBlocks.length, showTicker, tickerRunId])

  function resetExperience() {
    setSelectedTopic(null)
    setStep('idle')
    setResult(null)
    setError(null)
  }

  async function runTopic(topic: string) {
    if (!arenaReady || arenaIdentityLoading) {
      return
    }

    setSelectedTopic(topic)
    setResult(null)
    setError(null)
    setExploreBlocks([])
    setExploreError(null)
    setTickerRunId((currentRunId) => currentRunId + 1)
    setStep('researching')

    try {
      const researchResponse = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })

      const researchPayload = await readJson(researchResponse)
      if (!researchResponse.ok) {
        throw new Error(researchPayload.error ?? 'Claude research failed.')
      }

      setStep('publishing')

      const arenaResponse = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ research: researchPayload.research }),
      })

      const arenaPayload = await readJson(arenaResponse)
      if (!arenaResponse.ok) {
        throw new Error(arenaPayload.error ?? 'Are.na publishing failed.')
      }

      setResult(arenaPayload)
      setStep('complete')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown error.')
      setStep('error')
    }
  }

  function submitCustomTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const topic = normalizeTopicInput(customTopic)
    if (!topic) {
      return
    }

    void runTopic(topic)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-canvas text-text">
      <section
        className={`app-shell mx-auto grid h-screen w-full max-w-shell grid-rows-[auto_auto_1fr] px-page-x py-page-y ${
          showCompleteOverlay ? 'app-shell-complete' : ''
        }`}
      >
        <nav className="top-nav" aria-label="Are.na connection">
          <span className="nav-current">reBlock</span>

          <div className="nav-actions">
            {arenaIdentityLoading ? (
              <span className="nav-chip">Checking Are.na</span>
            ) : arenaIdentity?.authenticated && arenaIdentity.mode === 'oauth' ? (
              <>
                <span className="nav-chip">Connected · {arenaIdentity.username}</span>
                <a className="nav-chip nav-chip-link" href="/api/arena/oauth/logout">
                  Log out
                </a>
              </>
            ) : arenaIdentity?.authenticated && arenaIdentity.mode === 'demo' ? (
              <>
                <span className="nav-chip">Demo · {arenaIdentity.username}</span>
                {arenaIdentity.oauthAvailable && (
                  <a className="nav-chip nav-chip-link" href="/api/arena/oauth/start">
                    Connect Are.na
                  </a>
                )}
              </>
            ) : arenaIdentity?.oauthAvailable ? (
              <a className="nav-chip nav-chip-link" href="/api/arena/oauth/start">
                Connect Are.na
              </a>
            ) : (
              <span className="nav-chip">OAuth not configured</span>
            )}
          </div>
        </nav>

        <section className="state-panel" aria-live="polite">
          {step === 'idle' && (
            <>
              <p className="state-kicker">{arenaReady ? 'Ready' : 'Login to continue'}</p>
              <h1>Select a topic and kickstart your Are.na channel</h1>
            </>
          )}

          {isWorking && (
            <>
              <p className="state-kicker">{step === 'researching' ? 'Researching' : 'Publishing'}</p>
              <h1>{selectedTopic}</h1>
              <div className="state-inline">
                <Loader2 className="size-icon-sm animate-spin motion-reduce:animate-none" />
                <span>
                  {step === 'researching'
                    ? 'Searching sources and reading citations'
                    : 'Creating blocks and collecting images'}
                </span>
              </div>
            </>
          )}

          {step === 'complete' && result && (
            <>
              <p className="state-kicker">Complete</p>
              <h1>{selectedTopic}</h1>
            </>
          )}

          {step === 'error' && (
            <>
              <p className="state-kicker">Error</p>
              <h1>{error}</h1>
            </>
          )}

        </section>

        {showTicker ? (
          <section className="explore-ticker" aria-label="Recent Are.na blocks">
            {exploreBlocks.length > 0 ? (
              <div className="ticker-track">
                {[...exploreBlocks, ...exploreBlocks].map((block, index) => (
                  <a
                    key={`${block.id}-${index}`}
                    className="ticker-block"
                    href={block.sourceUrl ?? block.arenaUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {block.imageUrl ? (
                      <img src={block.imageUrl} alt="" />
                    ) : (
                      <span className="ticker-text-block">{block.title}</span>
                    )}
                    <span className="ticker-detail">
                      <span>{block.title}</span>
                      <span>
                        {block.type}
                        {block.author ? ` · ${block.author}` : ''}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="ticker-loading">{exploreError ?? 'Loading recent Are.na blocks'}</p>
            )}
          </section>
        ) : (
          <section className="topic-grid" aria-label="Research topics">
            <form className="topic-card topic-card-custom topic-card-0" onSubmit={submitCustomTopic}>
              <input
                aria-label="Custom research topic"
                className="topic-input"
                disabled={isWorking || arenaIdentityLoading || !arenaReady}
                maxLength={CUSTOM_TOPIC_MAX_CHARS}
                onChange={(event) => setCustomTopic(event.target.value)}
                placeholder="Try any topic"
                type="text"
                value={customTopic}
              />
              <button
                aria-label="Research custom topic"
                className="topic-submit"
                disabled={isWorking || arenaIdentityLoading || !arenaReady || !normalizeTopicInput(customTopic)}
                type="submit"
              >
                <ArrowUpRight className="size-icon-sm" aria-hidden="true" />
              </button>
            </form>
            {visibleTopics.map((topic, index) => (
              <button
                key={topic.name}
                type="button"
                className={`topic-card topic-card-${index + 1}`}
                onClick={() => runTopic(topic.name)}
                disabled={isWorking || arenaIdentityLoading || !arenaReady}
              >
                <span className="topic-title">{topic.name}</span>
              </button>
            ))}
          </section>
        )}
      </section>

      {showCompleteOverlay && result && (
        <section className="complete-overlay" aria-label="Channel created">
          <button type="button" className="complete-close" onClick={resetExperience}>
            Close
          </button>
          <p>Channel created</p>
          <a href={result.channelUrl} target="_blank" rel="noreferrer">
            {result.channelUrl}
            <ArrowUpRight className="size-icon-sm" aria-hidden="true" />
          </a>
        </section>
      )}
    </main>
  )
}

async function readJson(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return {
      error:
        response.status === 404
          ? 'API route not available in this dev server. Use Vercel dev or deploy to Vercel for the serverless routes.'
          : 'API route returned an invalid response.',
    }
  }
}

function normalizeTopicInput(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export default App
