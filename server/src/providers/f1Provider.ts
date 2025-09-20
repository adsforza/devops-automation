import type { CircuitInfo, DriverTelemetry } from '../types'

export interface F1AdapterConfig {
  baseUrl: string
  eventPath: string
  apiKey?: string | null
}

export class F1Provider {
  private readonly cfg: F1AdapterConfig
  constructor(cfg: F1AdapterConfig) {
    this.cfg = cfg
  }

  async getCircuitInfo(): Promise<CircuitInfo | null> {
    // Placeholder: requires official auth; return minimal info for now
    return {
      name: 'Official F1 Live Session',
      country: 'TBD',
      layoutSvgUrl: undefined,
      lengthKm: undefined
    }
  }

  // In a real implementation, this would connect to official live feeds
  async fetchLatestTelemetry(): Promise<DriverTelemetry[]> {
    return []
  }
}

