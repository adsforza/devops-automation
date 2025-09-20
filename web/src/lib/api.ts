const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

export interface SessionInfoResponse {
  provider: 'sim' | 'f1'
  circuit: { name: string; country?: string } | null
}

export async function fetchSessionInfo(): Promise<SessionInfoResponse> {
  const res = await fetch(`${API_URL}/api/session`)
  return res.json()
}

export interface TeamRadioItem {
  id: string
  driverId: string
  driverCode: string
  title: string
  url: string
  timestamp: number
}

export async function fetchTeamRadio(): Promise<TeamRadioItem[]> {
  const res = await fetch(`${API_URL}/api/audio`)
  return res.json()
}

export type BestLapItem = { driverCode: string; lapTimeMs: number }

export function subscribeBestLaps(onData: (items: BestLapItem[]) => void): () => void {
  const url = `${API_URL}/api/best-laps`
  const ev = new EventSource(url)
  const handler = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data)
      onData(data)
    } catch {}
  }
  ev.addEventListener('message', handler as any)
  ev.onmessage = handler
  return () => ev.close()
}

