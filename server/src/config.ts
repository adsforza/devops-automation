export type ProviderType = 'sim' | 'f1' | 'fastf1'

export interface AppConfig {
  provider: ProviderType
  port: number
  f1: {
    baseUrl: string | null
    eventPath: string | null
    apiKey: string | null
    sessionKey?: number | null
  }
  fastf1: {
    baseUrl: string | null
  }
}

export function loadConfig(): AppConfig {
  const provider = (process.env.PROVIDER as ProviderType) || 'sim'
  const port = process.env.PORT ? Number(process.env.PORT) : 4000
  return {
    provider,
    port,
    f1: {
      baseUrl: process.env.F1_BASE_URL || null,
      eventPath: process.env.F1_EVENT_PATH || null,
      apiKey: process.env.F1_API_KEY || null,
      sessionKey: process.env.F1_SESSION_KEY ? Number(process.env.F1_SESSION_KEY) : null
    },
    fastf1: {
      baseUrl: process.env.FASTF1_BASE_URL || null
    }
  }
}

