# Aplicación de Automatización de Scripts — Frontend

Frontend React + TypeScript con Chakra UI para ejecutar scripts autorizados y operaciones CRUD de forma segura, integrándose con el backend (OIDC vía AWS Identity Center), RBAC y auditoría.

## Características clave
- UI moderna con Chakra UI y tema personalizado (light/dark)
- Formularios dinámicos (react-hook-form) con validación y mensajes de error
- Vista de ejecución con previsualización de query, confirmación y progreso
- Tablas con paginación para resultados y auditoría
- Dashboard personalizado según permisos del usuario
- i18n (es/en) con react-i18next
- Gestión de datos con React Query (caché, reintentos, invalidación)

## Stack técnico
- React 18, TypeScript 5, Vite
- Chakra UI, Framer Motion, React Icons
- React Router, React Query, react-hook-form, react-i18next
- Axios para HTTP, Zod para validación de payloads
- Vitest + React Testing Library

## Estructura (propuesta)
```
frontend/
  src/
    app/
      router.tsx
      providers/
        ChakraProvider.tsx
        I18nProvider.tsx
        QueryProvider.tsx
      layout/
        MainLayout.tsx
    features/
      auth/
      dashboard/
      executions/
      crud/
      admin/
      audit/
    components/
      forms/
      tables/
      feedback/
    theme/
      index.ts
      colors.ts
      components.ts
    lib/
      api.ts
      i18n.ts
    pages/
      DashboardPage.tsx
      ExecutePage.tsx
      AdminPage.tsx
      AuditPage.tsx
  public/
  index.html
  vite.config.ts
  package.json
```

## Variables de entorno
Crea `.env` en `frontend/` (no lo subas al repositorio):
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_APP_ENV=development
VITE_I18N_DEFAULT_LOCALE=es
# Opcional
VITE_SENTRY_DSN=
VITE_FEATURE_FLAGS={}
```

## Puesta en marcha local
1. Instala dependencias
```bash
pnpm install
```
2. Arranca en desarrollo
```bash
pnpm dev
```
3. Build y preview
```bash
pnpm build && pnpm preview
```
4. Tests
```bash
pnpm test
```

Scripts sugeridos (`package.json`):
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5173",
    "lint": "eslint .",
    "test": "vitest --coverage"
  }
}
```

## Integración con autenticación (OIDC)
- El frontend no maneja tokens directamente. Usa endpoints del backend:
  - `GET {API}/auth/login` → redirige al proveedor (AWS Identity Center)
  - `POST {API}/auth/logout` → cierra sesión
  - `GET {API}/me` → obtiene perfil y permisos (usado para guardar estado y proteger rutas)
- Asegura `withCredentials` en Axios si el backend usa cookies de sesión.

## Seguridad en UI
- Usa componentes `FormControl` + `FormErrorMessage` para validación visible
- Sanitiza entradas visibles (p.ej., evita pegar SQL crudo en campos no permitidos)
- Deshabilita acciones según permisos (RBAC) y muestra tooltips de causa
- Configura CSP en `index.html` (production) sin `unsafe-inline` si es posible

## Páginas clave (mínimo)
- Dashboard (HU-013): accesos rápidos, estado de conexiones, ejecuciones recientes
- Ejecución (HU-014): formulario dinámico, preview (Code), confirmación (AlertDialog), progreso y resultados (Table)
- Administración: usuarios, roles, matriz de permisos editable
- Auditoría: búsqueda y visualización de eventos con filtros

## Theming (Chakra UI)
- Proveedor: `ChakraProvider` + `ColorModeScript`
- Tema custom con tokens de color, tipografía, componentes y dark mode
- Uso de props responsivas y sistema de Grid/Stack

## Accesibilidad
- Componentes accesibles por defecto (WCAG 2.1 AA)
- Gestión de foco en modales/dialogs y navegación por teclado
- Labels y `aria-*` en formularios dinámicos

## Observabilidad (opcional)
- Integración con Sentry/DataDog para front
- Medición de Web Vitals

## CI/CD (sugerido)
- GitHub Actions: lint, test, build, subida de artefacto (S3/CloudFront o SPA hosting)
- Versionado semántico y releases

## Troubleshooting
- Bloqueos CORS: alinear `VITE_API_BASE_URL` y `CORS_ORIGIN` del backend
- Redirecciones de login infinitas: limpiar cookies y comprobar base path de API
- Estilos rotos: verificar tema custom y orden de providers

## Licencia
MIT (ajustar según política de la organización)