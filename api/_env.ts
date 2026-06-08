import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export function getServerEnv(name: string) {
  if (process.env.VERCEL_ENV !== 'production') {
    const envPath = findLocalEnvPath()
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, 'm'))
      if (match) {
        return normalizeEnvValue(match[1])
      }
    }
  }

  return normalizeEnvValue(process.env[name])
}

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim().replace(/^["']|["']$/g, '')
  return normalized || undefined
}

function findLocalEnvPath() {
  const starts = [dirname(fileURLToPath(import.meta.url)), process.cwd(), process.env.PWD].filter(Boolean) as string[]

  for (const start of starts) {
    let current = start
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = join(current, '.env.local')
      if (existsSync(candidate)) {
        return candidate
      }

      const parent = dirname(current)
      if (parent === current) {
        break
      }
      current = parent
    }
  }

  return join(process.cwd(), '.env.local')
}
