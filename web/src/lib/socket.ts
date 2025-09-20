import { io, Socket } from 'socket.io-client'

export interface MiniSectorTiming {
  miniSectorIndex: number
  timeMs: number
  status: 'purple' | 'green' | 'yellow'
}

export interface SectorTiming {
  sectorId: 'S1' | 'S2' | 'S3'
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

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket'], autoConnect: true })
  }
  return socket
}

