import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';

type SectorId = 'S1' | 'S2' | 'S3';

interface MiniSectorTiming {
  miniSectorIndex: number;
  timeMs: number;
  status: 'purple' | 'green' | 'yellow';
}

interface SectorTiming {
  sectorId: SectorId;
  timeMs: number;
  miniSectors: MiniSectorTiming[];
  status: 'purple' | 'green' | 'yellow';
}

interface DriverTelemetry {
  driverId: string;
  driverCode: string;
  team: string;
  lap: number;
  lapTimeMs?: number;
  sectors: SectorTiming[];
  positionOnTrackPct: number; // 0..100
  speedKph: number;
  isOnHotLap: boolean;
  timestamp: number;
}

interface AudioClipMeta {
  id: string;
  driverId: string;
  driverCode: string;
  title: string;
  url: string;
  timestamp: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

// Simple in-memory state for simulation
const drivers = [
  { driverId: '44', driverCode: 'HAM', team: 'Mercedes' },
  { driverId: '1', driverCode: 'VER', team: 'Red Bull' },
  { driverId: '16', driverCode: 'LEC', team: 'Ferrari' },
  { driverId: '55', driverCode: 'SAI', team: 'Ferrari' },
  { driverId: '4', driverCode: 'NOR', team: 'McLaren' }
];

const bestSectorGlobal: Record<SectorId, number> = { S1: Infinity, S2: Infinity, S3: Infinity };
const bestSectorByDriver: Record<string, Record<SectorId, number>> = {};
const bestLapByDriver: Record<string, number> = {};

const audioClips: AudioClipMeta[] = [];

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateDriverTelemetry(prev?: Partial<DriverTelemetry> & { driverId: string; driverCode: string; team: string }): DriverTelemetry {
  const now = Date.now();
  const lap = (prev?.lap ?? 0) + (Math.random() < 0.05 ? 1 : 0);
  const positionOnTrackPct = ((prev?.positionOnTrackPct ?? randRange(0, 100)) + randRange(0.5, 2.5)) % 100;
  const speedKph = Math.max(80, Math.min(340, (prev?.speedKph ?? randRange(180, 320)) + randRange(-5, 5)));
  const isOnHotLap = speedKph > 250;

  // Simulate sector times when crossing sector lines
  const sectors: SectorTiming[] = ['S1', 'S2', 'S3'].map((s) => ({
    sectorId: s as SectorId,
    timeMs: Math.floor(randRange(25000, 45000)),
    miniSectors: Array.from({ length: 5 }).map((_, i) => ({
      miniSectorIndex: i,
      timeMs: Math.floor(randRange(4000, 9000)),
      status: 'yellow' as const
    })),
    status: 'yellow'
  }));

  // Color logic vs personal and global records
  sectors.forEach((sector) => {
    const driverBest = (bestSectorByDriver[prev!.driverId]?.[sector.sectorId]) ?? Infinity;
    if (!bestSectorByDriver[prev!.driverId]) bestSectorByDriver[prev!.driverId] = { S1: Infinity, S2: Infinity, S3: Infinity };
    if (sector.timeMs < bestSectorGlobal[sector.sectorId]) {
      bestSectorGlobal[sector.sectorId] = sector.timeMs;
      sector.status = 'purple';
    } else if (sector.timeMs < driverBest) {
      bestSectorByDriver[prev!.driverId][sector.sectorId] = sector.timeMs;
      sector.status = 'green';
    } else {
      sector.status = 'yellow';
    }

    sector.miniSectors.forEach((mini) => {
      const baseline = sector.timeMs / sector.miniSectors.length;
      if (mini.timeMs < baseline * 0.95) mini.status = 'green';
      if (mini.timeMs < (bestSectorGlobal[sector.sectorId] / sector.miniSectors.length) * 0.95) mini.status = 'purple';
    });
  });

  const lapTimeMs = sectors.reduce((sum, s) => sum + s.timeMs, 0);
  if (lap > (prev?.lap ?? 0)) {
    const driverId = prev!.driverId;
    bestLapByDriver[driverId] = Math.min(bestLapByDriver[driverId] ?? Infinity, lapTimeMs);
  }

  return {
    driverId: prev!.driverId,
    driverCode: prev!.driverCode,
    team: prev!.team,
    lap,
    sectors,
    lapTimeMs,
    positionOnTrackPct,
    speedKph,
    isOnHotLap,
    timestamp: now
  };
}

// Keep last telemetry per driver
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
    positionOnTrackPct: randRange(0, 100),
    speedKph: randRange(200, 320),
    isOnHotLap: false,
    timestamp: Date.now()
  } as DriverTelemetry])
);

// REST: audio clips (simulated URLs)
app.get('/api/audio', (_req, res) => {
  res.json(audioClips);
});

// SSE for lap bests (optional showcase)
app.get('/api/best-laps', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = () => {
    res.write(`data: ${JSON.stringify(bestLapByDriver)}\n\n`);
  };
  const interval = setInterval(send, 2000);
  req.on('close', () => clearInterval(interval));
});

io.on('connection', (socket) => {
  // Send current snapshot
  socket.emit('telemetry:snapshot', Object.values(lastTelemetryByDriver));
});

// Simulation loop
setInterval(() => {
  const updates: DriverTelemetry[] = drivers.map((d) => {
    const update = generateDriverTelemetry(lastTelemetryByDriver[d.driverId]);
    lastTelemetryByDriver[d.driverId] = update;
    // Occasionally create an audio clip
    if (Math.random() < 0.03) {
      audioClips.push({
        id: `${update.driverId}-${Date.now()}`,
        driverId: update.driverId,
        driverCode: update.driverCode,
        title: `${update.driverCode} radio at lap ${update.lap}`,
        url: `https://files.example.com/audio/${update.driverCode}-${Date.now()}.mp3`,
        timestamp: Date.now()
      });
      if (audioClips.length > 50) audioClips.shift();
    }
    return update;
  });
  io.emit('telemetry:update', updates);
}, 1000);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Telemetry server listening on http://localhost:${PORT}`);
});

