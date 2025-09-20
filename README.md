F1 Live Telemetry (OpenF1 + Simulator)

Requisitos
- Node.js 18+

Variables de entorno (server/.env)
```
F1_BASE_URL=https://api.openf1.org/v1
F1_EVENT_PATH=/sessions
F1_API_KEY=
# Opcional: fija una sesión específica
# F1_SESSION_KEY=123456
PROVIDER=f1
```
- Usa `PROVIDER=sim` para correr con datos simulados.

Arranque en desarrollo
```
# Instalar dependencias raíz y de subproyectos
npm install
npm --prefix server install
npm --prefix web install

# Levantar frontend y backend juntos
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

Endpoints clave (backend)
- GET `/api/session` — Info del circuito y proveedor activo
- GET `/api/audio` — Listado de radios (OpenF1) o simuladas
- SSE `/api/best-laps` — Mejores vueltas en tiempo real
- Socket.IO — `telemetry:snapshot`, `telemetry:update`

Notas
- Con `PROVIDER=f1`, los datos vienen de OpenF1. Si el feed no tiene actividad, la UI puede mostrar pocos elementos. Cambia a `PROVIDER=sim` para una demo rica.
