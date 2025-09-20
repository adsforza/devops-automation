export type SectorId = 'S1' | 'S2' | 'S3'

export interface MiniSectorTiming {
  miniSectorIndex: number
  timeMs: number
  status: 'purple' | 'green' | 'yellow'
}

export interface SectorTiming {
  sectorId: SectorId
  timeMs: number
  miniSectors: MiniSectorTiming[]
  status: 'purple' | 'green' | 'yellow'
}

export interface DriverTelemetry {
  driverId: string
  driverCode: string
  team: string
  lap: number
  lapTimeMs?: number
  sectors: SectorTiming[]
  positionOnTrackPct: number
  speedKph: number
  isOnHotLap: boolean
  timestamp: number
}

export interface CircuitInfo {
  name: string
  country: string
  layoutSvgUrl?: string
  lengthKm?: number
}

