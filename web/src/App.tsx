import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { getSocket, type DriverTelemetry } from './lib/socket'
import { fetchSessionInfo, fetchTeamRadio, subscribeBestLaps, type SessionInfoResponse, type TeamRadioItem } from './lib/api'

function formatMs(ms?: number) {
  if (!ms || !isFinite(ms)) return '--:--.---'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = Math.floor(ms % 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function useTelemetry() {
  const [telemetry, setTelemetry] = useState<DriverTelemetry[]>([])

  useEffect(() => {
    const s = getSocket()
    const handleSnapshot = (data: DriverTelemetry[]) => setTelemetry(data)
    const handleUpdate = (data: DriverTelemetry[]) => {
      setTelemetry((prev) => {
        const map = new Map(prev.map((t) => [t.driverId, t]))
        data.forEach((u) => map.set(u.driverId, u))
        return Array.from(map.values())
      })
    }
    s.on('telemetry:snapshot', handleSnapshot)
    s.on('telemetry:update', handleUpdate)
    return () => {
      s.off('telemetry:snapshot', handleSnapshot)
      s.off('telemetry:update', handleUpdate)
    }
  }, [])

  return telemetry
}

function colorFor(status: 'purple' | 'green' | 'yellow') {
  if (status === 'purple') return '#a020f0'
  if (status === 'green') return '#2ecc71'
  return '#f1c40f'
}

function TrackMap({ cars }: { cars: DriverTelemetry[] }) {
  // Simple oval track path mapping positionOnTrackPct to xy
  const width = 800
  const height = 400
  const centerX = width / 2
  const centerY = height / 2
  const rx = 320
  const ry = 150

  const points = useMemo(() => {
    return cars.map((c) => {
      if (typeof c.normalizedX === 'number' && typeof c.normalizedY === 'number') {
        const x = centerX + rx * c.normalizedX
        const y = centerY + ry * c.normalizedY
        return { ...c, x, y }
      }
      const angle = (c.positionOnTrackPct / 100) * 2 * Math.PI
      const x = centerX + rx * Math.cos(angle)
      const y = centerY + ry * Math.sin(angle)
      return { ...c, x, y }
    })
  }, [cars])

  return (
    <svg width={width} height={height} style={{ background: '#0b0f1a', borderRadius: 12 }}>
      <ellipse cx={centerX} cy={centerY} rx={rx} ry={ry} fill="#25324a" stroke="#3b4b6b" strokeWidth={6} />
      {points.map((p) => (
        <g key={p.driverId}>
          <circle cx={p.x} cy={p.y} r={8} fill="#ecf0f1" stroke="#111" strokeWidth={2} />
          <text x={p.x + 12} y={p.y + 4} fontFamily="monospace" fontSize={12} fill="#ecf0f1">{p.driverCode}</text>
        </g>
      ))}
    </svg>
  )
}

function TimingTower({ cars }: { cars: DriverTelemetry[] }) {
  const sorted = [...cars].sort((a, b) => (a.positionOnTrackPct > b.positionOnTrackPct ? -1 : 1))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((c) => (
        <div key={c.driverId} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 52px 52px 52px 96px', gap: 8, alignItems: 'center', background: '#0f1626', padding: '8px 10px', borderRadius: 8 }}>
          <div style={{ color: '#bdc3c7', fontFamily: 'monospace' }}>{c.driverCode}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {c.sectors.map((s) => (
              <div key={s.sectorId} style={{ display: 'flex', gap: 2 }}>
                <div style={{ width: 52, textAlign: 'right', color: colorFor(s.status), fontFamily: 'monospace' }}>{(s.timeMs === Infinity || Number.isNaN(s.timeMs)) ? '--:--' : Math.floor(s.timeMs / 1000).toString().padStart(2, '0') + '.' + String(Math.floor(s.timeMs % 1000)).padStart(3, '0')}</div>
                <div style={{ display: 'flex', gap: 1 }}>
                  {s.miniSectors.slice(0, 5).map((m) => (
                    <span key={m.miniSectorIndex} title={`${m.timeMs} ms`} style={{ width: 6, height: 12, background: colorFor(m.status), display: 'inline-block', borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ color: '#95a5a6', fontFamily: 'monospace', textAlign: 'right' }}>{formatMs(c.lapTimeMs)}</div>
          <div style={{ color: '#95a5a6', fontFamily: 'monospace', textAlign: 'right' }}>{Math.round(c.speedKph)} km/h</div>
          <div style={{ color: '#95a5a6', fontFamily: 'monospace', textAlign: 'right' }}>Lap {c.lap}</div>
        </div>
      ))}
    </div>
  )
}

function App() {
  const telemetry = useTelemetry()
  const [sessionInfo, setSessionInfo] = useState<SessionInfoResponse | null>(null)
  const [radio, setRadio] = useState<TeamRadioItem[]>([])
  const [bestLaps, setBestLaps] = useState<{ driverCode: string; lapTimeMs: number }[]>([])

  useEffect(() => {
    fetchSessionInfo().then(setSessionInfo).catch(() => setSessionInfo(null))
    const loadRadio = () => fetchTeamRadio().then(setRadio).catch(() => {})
    loadRadio()
    const id = setInterval(loadRadio, 10000)
    const unsub = subscribeBestLaps(setBestLaps)
    return () => { clearInterval(id); unsub() }
  }, [])
  return (
    <div style={{ padding: 16, color: '#ecf0f1', background: '#0b0f1a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ marginTop: 0 }}>F1 Live Telemetry</h2>
        <div style={{ color: '#95a5a6', fontFamily: 'monospace' }}>
          {sessionInfo?.circuit ? `${sessionInfo.circuit.name}${sessionInfo.circuit.country ? ' — ' + sessionInfo.circuit.country : ''}` : 'Cargando circuito...'}
          {' '}<span style={{ opacity: 0.7 }}>[{sessionInfo?.provider ?? 'sim'}]</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <TrackMap cars={telemetry} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TimingTower cars={telemetry} />
          <BestLapsPanel items={bestLaps} />
          <RadioPanel items={radio} />
        </div>
      </div>
    </div>
  )
}

export default App

function RadioPanel({ items }: { items: TeamRadioItem[] }) {
  return (
    <div style={{ background: '#0f1626', borderRadius: 8, padding: 10 }}>
      <div style={{ marginBottom: 8, color: '#bdc3c7' }}>Team Radio</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflow: 'auto' }}>
        {items.length === 0 && <div style={{ color: '#7f8c8d' }}>Sin radios recientes</div>}
        {items.map((it) => (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 72px', gap: 8, alignItems: 'center' }}>
            <div style={{ color: '#ecf0f1', fontFamily: 'monospace' }}>{it.driverCode}</div>
            <div style={{ color: '#bdc3c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title || 'Radio'}</div>
            <audio controls preload="none" src={it.url} style={{ width: '100%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function BestLapsPanel({ items }: { items: { driverCode: string; lapTimeMs: number }[] }) {
  return (
    <div style={{ background: '#0f1626', borderRadius: 8, padding: 10 }}>
      <div style={{ marginBottom: 8, color: '#bdc3c7' }}>Mejores Vueltas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.length === 0 && <div style={{ color: '#7f8c8d' }}>Sin datos</div>}
        {items.map((it, idx) => (
          <div key={it.driverCode + idx} style={{ display: 'grid', gridTemplateColumns: '28px 64px 1fr', gap: 8, alignItems: 'center' }}>
            <div style={{ color: '#95a5a6', textAlign: 'right' }}>{idx + 1}</div>
            <div style={{ color: '#ecf0f1', fontFamily: 'monospace' }}>{it.driverCode}</div>
            <div style={{ color: '#ecf0f1', fontFamily: 'monospace' }}>{formatMs(it.lapTimeMs)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
