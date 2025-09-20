import type { DriverTelemetry } from '../types'

export interface SimState {
  drivers: { driverId: string; driverCode: string; team: string }[]
  lastTelemetryByDriver: Record<string, DriverTelemetry>
  bestSectorGlobal: Record<'S1' | 'S2' | 'S3', number>
  bestSectorByDriver: Record<string, Record<'S1' | 'S2' | 'S3', number>>
  bestLapByDriver: Record<string, number>
}

export function createSimInitialState(): SimState {
  const drivers = [
    { driverId: '44', driverCode: 'HAM', team: 'Mercedes' },
    { driverId: '1', driverCode: 'VER', team: 'Red Bull' },
    { driverId: '16', driverCode: 'LEC', team: 'Ferrari' },
    { driverId: '55', driverCode: 'SAI', team: 'Ferrari' },
    { driverId: '4', driverCode: 'NOR', team: 'McLaren' }
  ]

  const bestSectorGlobal = { S1: Infinity, S2: Infinity, S3: Infinity as number }
  const bestSectorByDriver: Record<string, Record<'S1' | 'S2' | 'S3', number>> = {}
  const bestLapByDriver: Record<string, number> = {}

  const lastTelemetryByDriver: Record<string, DriverTelemetry> = Object.fromEntries(
    drivers.map((d) => [d.driverId, {
      driverId: d.driverId,
      driverCode: d.driverCode,
      team: d.team,
      lap: 0,
      sectors: [
        { sectorId: 'S1', timeMs: Infinity, miniSectors: [], status: 'yellow' },
        { sectorId: 'S2', timeMs: Infinity, miniSectors: [], status: 'yellow' },
        { sectorId: 'S3', timeMs: Infinity, miniSectors: [], status: 'yellow' }
      ],
      positionOnTrackPct: Math.random() * 100,
      speedKph: 220 + Math.random() * 80,
      isOnHotLap: false,
      timestamp: Date.now()
    } as DriverTelemetry])
  )

  return { drivers, bestSectorGlobal, bestSectorByDriver, bestLapByDriver, lastTelemetryByDriver }
}

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function nextSimTick(state: SimState) {
  type SectorId = 'S1' | 'S2' | 'S3'
  const updates: DriverTelemetry[] = state.drivers.map((d) => {
    const prev = state.lastTelemetryByDriver[d.driverId]
    const now = Date.now()
    const lap = prev.lap + (Math.random() < 0.05 ? 1 : 0)
    const positionOnTrackPct = (prev.positionOnTrackPct + randRange(0.5, 2.5)) % 100
    const speedKph = Math.max(80, Math.min(340, prev.speedKph + randRange(-5, 5)))
    const isOnHotLap = speedKph > 250

    const sectors = (['S1', 'S2', 'S3'] as SectorId[]).map((s) => ({
      sectorId: s,
      timeMs: Math.floor(randRange(25000, 45000)),
      miniSectors: Array.from({ length: 5 }).map((_, i) => ({
        miniSectorIndex: i,
        timeMs: Math.floor(randRange(4000, 9000)),
        status: 'yellow' as const
      })),
      status: 'yellow' as const
    }))

    sectors.forEach((sector) => {
      const driverBest = (state.bestSectorByDriver[d.driverId]?.[sector.sectorId]) ?? Infinity
      if (!state.bestSectorByDriver[d.driverId]) state.bestSectorByDriver[d.driverId] = { S1: Infinity, S2: Infinity, S3: Infinity }
      if (sector.timeMs < state.bestSectorGlobal[sector.sectorId]) {
        state.bestSectorGlobal[sector.sectorId] = sector.timeMs
        sector.status = 'purple'
      } else if (sector.timeMs < driverBest) {
        state.bestSectorByDriver[d.driverId][sector.sectorId] = sector.timeMs
        sector.status = 'green'
      } else {
        sector.status = 'yellow'
      }

      sector.miniSectors.forEach((mini) => {
        const baseline = sector.timeMs / sector.miniSectors.length
        if (mini.timeMs < baseline * 0.95) mini.status = 'green'
        if (mini.timeMs < (state.bestSectorGlobal[sector.sectorId] / sector.miniSectors.length) * 0.95) mini.status = 'purple'
      })
    })

    const lapTimeMs = sectors.reduce((sum, s) => sum + s.timeMs, 0)
    if (lap > prev.lap) {
      state.bestLapByDriver[d.driverId] = Math.min(state.bestLapByDriver[d.driverId] ?? Infinity, lapTimeMs)
    }

    const update: DriverTelemetry = {
      driverId: prev.driverId,
      driverCode: prev.driverCode,
      team: prev.team,
      lap,
      sectors,
      lapTimeMs,
      positionOnTrackPct,
      speedKph,
      isOnHotLap,
      timestamp: now
    }
    state.lastTelemetryByDriver[d.driverId] = update
    return update
  })

  return updates
}

