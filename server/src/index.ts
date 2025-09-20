import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import 'dotenv/config';
import { loadConfig } from './config';
import type { DriverTelemetry } from './types';
import { createSimInitialState, nextSimTick } from './providers/simProvider';
import { F1Provider } from './providers/f1Provider';
import { FastF1Provider } from './providers/fastf1Provider';

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

const cfg = loadConfig();
const simState = createSimInitialState();
const audioClips: AudioClipMeta[] = [];
const f1Provider = cfg.f1.baseUrl && cfg.f1.eventPath
  ? new F1Provider({ baseUrl: cfg.f1.baseUrl!, eventPath: cfg.f1.eventPath!, apiKey: cfg.f1.apiKey, sessionKey: cfg.f1.sessionKey ?? undefined })
  : null;
const fastf1Provider = cfg.fastf1.baseUrl ? new FastF1Provider({ baseUrl: cfg.fastf1.baseUrl! }) : null;
let providerMode: 'f1' | 'sim' | 'fastf1' = cfg.provider as any;
let emptyF1Cycles = 0;

// REST: audio clips (simulated URLs)
app.get('/api/audio', async (_req, res) => {
  if (f1Provider) {
    const radios = await f1Provider.fetchLatestTeamRadio(20);
    return res.json(radios);
  }
  res.json(audioClips);
});

app.get('/api/session', async (_req, res) => {
  if (providerMode === 'fastf1' && fastf1Provider) {
    const info = await fastf1Provider.getCircuitInfo();
    return res.json({ provider: 'fastf1', circuit: info });
  }
  if (f1Provider && providerMode === 'f1') {
    const info = await f1Provider.getCircuitInfo();
    return res.json({ provider: 'f1', circuit: info });
  }
  return res.json({ provider: 'sim', circuit: { name: 'Simulated Circuit', country: 'N/A' } });
});

// SSE for lap bests (optional showcase)
app.get('/api/best-laps', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  let active = true;
  const send = async () => {
    if (!active) return;
    try {
      if (f1Provider) {
        const session = await (f1Provider as any).ensureSession?.();
        if (!session) return res.write(`data: ${JSON.stringify([])}\n\n`);
        const url = new URL(`${process.env.F1_BASE_URL?.replace(/\/$/, '')}/laps`);
        url.searchParams.set('session_key', String(session.session_key));
        url.searchParams.set('order_by', 'driver_number,-lap_number');
        url.searchParams.set('limit', '200');
        const r = await fetch(url.toString());
        const arr: any[] = r.ok ? await r.json() : [];
        const bestByDriver: Record<string, { driverCode: string; lapTimeMs: number }> = {};
        for (const l of arr) {
          const code = String(l.driver_number).padStart(2, '0');
          const ms = toMs(l.lap_duration);
          if (!isFinite(ms)) continue;
          if (!bestByDriver[code] || ms < bestByDriver[code].lapTimeMs) bestByDriver[code] = { driverCode: code, lapTimeMs: ms };
        }
        const list = Object.values(bestByDriver).sort((a, b) => a.lapTimeMs - b.lapTimeMs).slice(0, 20);
        return res.write(`data: ${JSON.stringify(list)}\n\n`);
      } else {
        // For simulator: compute from latest snapshot
        const list = Object.values(simState.lastTelemetryByDriver)
          .filter((t) => isFinite(t.lapTimeMs ?? NaN))
          .map((t) => ({ driverCode: t.driverCode, lapTimeMs: t.lapTimeMs! }))
          .sort((a, b) => a.lapTimeMs - b.lapTimeMs)
          .slice(0, 20);
        return res.write(`data: ${JSON.stringify(list)}\n\n`);
      }
    } catch {}
  };
  const interval = setInterval(send, 3000);
  send();
  req.on('close', () => { active = false; clearInterval(interval); });
});

io.on('connection', async (socket) => {
  // Send current snapshot
  if (providerMode === 'fastf1' && fastf1Provider) {
    try {
      const snap = await fastf1Provider.fetchLatestTelemetry();
      socket.emit('telemetry:snapshot', snap);
    } catch (e) {
      socket.emit('telemetry:snapshot', [] as DriverTelemetry[]);
    }
  } else if (f1Provider && providerMode === 'f1') {
    try {
      const snap = await f1Provider.fetchLatestTelemetry();
      socket.emit('telemetry:snapshot', snap);
    } catch (e) {
      socket.emit('telemetry:snapshot', [] as DriverTelemetry[]);
    }
  } else {
    socket.emit('telemetry:snapshot', Object.values(simState.lastTelemetryByDriver));
  }
});

// Simulation loop
setInterval(() => {
  if (providerMode === 'fastf1' && fastf1Provider) {
    fastf1Provider.fetchLatestTelemetry()
      .then((updates) => {
        if (updates.length) io.emit('telemetry:update', updates as any);
      })
      .catch(() => {})
  } else if (f1Provider && providerMode === 'f1') {
    f1Provider.fetchLatestTelemetry()
      .then((updates) => {
        if (updates.length) io.emit('telemetry:update', updates);
      })
      .catch(() => {})
  } else {
    const updates = nextSimTick(simState);
    if (Math.random() < 0.03 && updates.length > 0) {
      const update = updates[Math.floor(Math.random() * updates.length)];
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
    io.emit('telemetry:update', updates);
  }
}, 1000);

const PORT = cfg.port;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Telemetry server listening on http://localhost:${PORT} (provider=${cfg.provider})`);
});

