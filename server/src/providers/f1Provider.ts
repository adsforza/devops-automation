import type { CircuitInfo, DriverTelemetry } from '../types'

export interface F1AdapterConfig {
  baseUrl: string
  eventPath: string
  apiKey?: string | null
  sessionKey?: number | null
}

export class F1Provider {
  private readonly cfg: F1AdapterConfig
  private sessionKey: number | null
  private lastXYByDriver: Map<number, { x: number; y: number; t: number }> = new Map()
  private bestSectorGlobal: Record<'S1' | 'S2' | 'S3', number> = { S1: Infinity, S2: Infinity, S3: Infinity }
  private bestSectorByDriver: Map<number, Record<'S1' | 'S2' | 'S3', number>> = new Map()
  constructor(cfg: F1AdapterConfig) {
    this.cfg = cfg
    this.sessionKey = cfg.sessionKey ?? null
  }

  async getCircuitInfo(): Promise<CircuitInfo | null> {
    const session = await this.ensureSession()
    if (!session) return null
    return {
      name: session.session_name || session.meeting_name || 'F1 Session',
      country: session.country || session.location || 'Unknown',
      layoutSvgUrl: undefined,
      lengthKm: undefined
    }
  }

  async fetchLatestTelemetry(): Promise<DriverTelemetry[]> {
    const session = await this.ensureSession()
    if (!session) return []
    const sessionKey = session.session_key

    const positionsUrl = new URL(`${this.cfg.baseUrl.replace(/\/$/, '')}/position`)
    positionsUrl.searchParams.set('session_key', String(sessionKey))
    positionsUrl.searchParams.set('order_by', '-date')
    positionsUrl.searchParams.set('limit', '200')
    const posResp = await fetch(positionsUrl)
    if (!posResp.ok) return []
    const posRaw: any[] = await posResp.json()
    // Deduplicate: keep newest per driver_number
    const seen = new Set<number>()
    const posJson: any[] = []
    for (const row of posRaw) {
      const dn = row.driver_number
      if (seen.has(dn)) continue
      seen.add(dn)
      posJson.push(row)
    }

    // Fetch most recent laps data to infer sector times per driver
    const lapsUrl = new URL(`${this.cfg.baseUrl.replace(/\/$/, '')}/laps`)
    lapsUrl.searchParams.set('session_key', String(sessionKey))
    lapsUrl.searchParams.set('order_by', '-lap_number')
    lapsUrl.searchParams.set('limit', '200')
    const lapsResp = await fetch(lapsUrl)
    const lapsJson: any[] = lapsResp.ok ? await lapsResp.json() : []
    const latestLapByDriver: Map<number, any> = new Map()
    for (const l of lapsJson) {
      const dn = l.driver_number
      if (!latestLapByDriver.has(dn)) latestLapByDriver.set(dn, l)
    }

    const now = Date.now()

    const updates: DriverTelemetry[] = posJson.map((p) => {
      const driverNumber: number = p.driver_number
      const x: number | undefined = p.x
      const y: number | undefined = p.y
      // Compute a pseudo position percentage around an oval using angle
      let positionOnTrackPct = 0
      let normalizedX: number | undefined
      let normalizedY: number | undefined
      if (typeof x === 'number' && typeof y === 'number') {
        const angle = Math.atan2(y, x) // -PI..PI
        positionOnTrackPct = ((angle + Math.PI) / (2 * Math.PI)) * 100
        // Positions endpoint returns coordinates on [-1,1] range typically
        normalizedX = x
        normalizedY = y
      }

      // Estimate speed from delta distance if we have last point (units arbitrary -> scale to kph)
      let speedKph = 250
      const last = this.lastXYByDriver.get(driverNumber)
      if (last && typeof x === 'number' && typeof y === 'number') {
        const dt = (now - last.t) / 1000
        if (dt > 0) {
          const dx = x - last.x
          const dy = y - last.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          // Scale factor chosen to yield plausible kph
          speedKph = Math.max(50, Math.min(350, (dist / dt) * 600))
        }
      }
      if (typeof x === 'number' && typeof y === 'number') {
        this.lastXYByDriver.set(driverNumber, { x, y, t: now })
      }

      const driverCode = (p.driver_number != null) ? String(p.driver_number).padStart(2, '0') : 'DR'
      const team = p.team_name || 'Unknown'

      // Build sectors from latest lap if available
      const lastLap = latestLapByDriver.get(driverNumber)
      const s1 = toMs(lastLap?.sector_1_time)
      const s2 = toMs(lastLap?.sector_2_time)
      const s3 = toMs(lastLap?.sector_3_time)
      const sectors: DriverTelemetry['sectors'] = [
        { sectorId: 'S1', timeMs: s1, miniSectors: [], status: 'yellow' },
        { sectorId: 'S2', timeMs: s2, miniSectors: [], status: 'yellow' },
        { sectorId: 'S3', timeMs: s3, miniSectors: [], status: 'yellow' }
      ]

      // Color logic: update globals and personal bests
      const personal = this.bestSectorByDriver.get(driverNumber) ?? { S1: Infinity, S2: Infinity, S3: Infinity }
      sectors.forEach((sec) => {
        if (isFinite(sec.timeMs)) {
          if (sec.timeMs < this.bestSectorGlobal[sec.sectorId]) {
            this.bestSectorGlobal[sec.sectorId] = sec.timeMs
            sec.status = 'purple'
          } else if (sec.timeMs < personal[sec.sectorId]) {
            personal[sec.sectorId] = sec.timeMs
            sec.status = 'green'
          } else {
            sec.status = 'yellow'
          }
        } else {
          sec.status = 'yellow'
        }
      })
      this.bestSectorByDriver.set(driverNumber, personal)

      // Fill mini-sectors heuristically (OpenF1 doesn't expose micro-sectors)
      for (const sec of sectors) {
        const count = 5
        const base = isFinite(sec.timeMs) ? Math.max(1, Math.floor(sec.timeMs / count)) : 0
        sec.miniSectors = Array.from({ length: count }).map((_, i) => ({
          miniSectorIndex: i,
          timeMs: base,
          status: sec.status
        }))
      }

      const telem: DriverTelemetry = {
        driverId: driverCode,
        driverCode,
        team,
        lap: lastLap?.lap_number || p.lap_number || 0,
        sectors,
        positionOnTrackPct,
        speedKph,
        isOnHotLap: speedKph > 250,
        timestamp: now,
        normalizedX,
        normalizedY
      }
      return telem
    })

    return updates
  }

  async fetchLatestTeamRadio(limit = 20): Promise<{ id: string; driverCode: string; url: string; title: string; timestamp: number; driverId: string }[]> {
    const session = await this.ensureSession()
    if (!session) return []
    const sessionKey = session.session_key
    const url = new URL(`${this.cfg.baseUrl.replace(/\/$/, '')}/team_radio`)
    url.searchParams.set('session_key', String(sessionKey))
    url.searchParams.set('order_by', '-date')
    url.searchParams.set('limit', String(limit))
    const resp = await fetch(url)
    if (!resp.ok) return []
    const json: any[] = await resp.json()
    return json.map((r) => ({
      id: r.uuid || `${r.driver_number}-${r.date}`,
      driverCode: (r.driver_number != null) ? String(r.driver_number).padStart(2, '0') : 'DR',
      driverId: (r.driver_number != null) ? String(r.driver_number).padStart(2, '0') : 'DR',
      url: r.recording_url || r.url || '',
      title: r.transcript || `${r.driver_number} radio`,
      timestamp: r.date ? Date.parse(r.date) : Date.now()
    }))
  }

  private async ensureSession(): Promise<any | null> {
    if (this.sessionKey) return { session_key: this.sessionKey }
    // Try to find an active or latest session with several strategies
    const base = this.cfg.baseUrl.replace(/\/$/, '')
    const tryUrls: string[] = [
      `${base}/sessions?session_status=active&order_by=-date_start&limit=1`,
      `${base}/sessions?order_by=-date_start&limit=1`
    ]
    for (const u of tryUrls) {
      try {
        const resp = await fetch(u)
        if (!resp.ok) continue
        const arr: any[] = await resp.json()
        if (arr && arr.length) {
          const s = arr[0]
          this.sessionKey = s.session_key
          return s
        }
      } catch {}
    }
    return null
  }
}

function toMs(value: any): number {
  if (value == null) return NaN as unknown as number
  if (typeof value === 'number') return Math.floor(value * 1000)
  const n = Number(value)
  if (!Number.isFinite(n)) return NaN as unknown as number
  return Math.floor(n * 1000)
}

