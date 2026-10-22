import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export function getServerEnv(name: string) {
  if (!process.env.VERCEL) {
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
  return join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
}
