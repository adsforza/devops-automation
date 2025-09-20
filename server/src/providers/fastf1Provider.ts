export interface FastF1Config {
  baseUrl: string
}

export class FastF1Provider {
  private readonly cfg: FastF1Config
  constructor(cfg: FastF1Config) {
    this.cfg = cfg
  }

  async getCircuitInfo(): Promise<{ name: string; country?: string } | null> {
    const url = new URL(`${this.cfg.baseUrl.replace(/\/$/, '')}/session`)
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    return j.circuit ?? null
  }

  async fetchLatestTelemetry(): Promise<any[]> {
    const url = new URL(`${this.cfg.baseUrl.replace(/\/$/, '')}/snapshot`)
    const r = await fetch(url)
    if (!r.ok) return []
    const j = await r.json()
    return j.telemetry ?? []
  }
}

