import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { loadConfig } from './config';
import type { DriverTelemetry } from './types';
import { createSimInitialState, nextSimTick } from './providers/simProvider';
import { F1Provider } from './providers/f1Provider';

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
const f1Provider = cfg.provider === 'f1' && cfg.f1.baseUrl && cfg.f1.eventPath
  ? new F1Provider({ baseUrl: cfg.f1.baseUrl, eventPath: cfg.f1.eventPath, apiKey: cfg.f1.apiKey })
  : null;

// REST: audio clips (simulated URLs)
app.get('/api/audio', (_req, res) => {
  res.json(audioClips);
});

app.get('/api/session', async (_req, res) => {
  if (f1Provider) {
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
  const send = () => {
    // Not tracking per-driver bests in this refactor; left for future
    res.write(`data: ${JSON.stringify({})}\n\n`);
  };
  const interval = setInterval(send, 2000);
  req.on('close', () => clearInterval(interval));
});

io.on('connection', (socket) => {
  // Send current snapshot
  socket.emit('telemetry:snapshot', Object.values(simState.lastTelemetryByDriver));
});

// Simulation loop
setInterval(() => {
  if (f1Provider) {
    // Placeholder: would poll or stream official feed; not implemented
    io.emit('telemetry:update', [] as DriverTelemetry[]);
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

