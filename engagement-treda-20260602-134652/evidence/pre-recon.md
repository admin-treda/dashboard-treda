# Pre-Recon: Source Code Analysis

## Arquitectura
- **API:** Fastify + TypeScript + Prisma + PostgreSQL en :3000
- **Dashboard:** React 18 + Vite + Tailwind + shadcn/ui en :5173
- **Auth:** JWT (@fastify/jwt), bcrypt para passwords
- **ORM:** Prisma con PostgreSQL
- **Validación:** Zod schemas en body/params/query
- **Rate-limit:** 300 req/min global (@fastify/rate-limit)
- **Colector:** Polling cada 20min, costos 1x/día 7AM Colombia

## Hallazgos de Código (Pre-Recon)

### H-001: /api/v1/collect sin autenticación (CRÍTICO)
**Archivo:** `src/index.ts` (línea ~40)
**Descripción:** Endpoint `GET /api/v1/collect` no tiene preHandler ni requireRole. Cualquier persona puede disparar recolección de datos de AWS/Azure si el endpoint es accesible.
**Código:**
```typescript
app.get("/api/v1/collect", async () => {
  await collectAllAccounts(); // Sin auth
```
**CWE:** CWE-306 (Missing Authentication for Critical Function)

### H-002: /api/v1/poll-status sin autenticación (MEDIO)
**Archivo:** `src/index.ts`
**Descripción:** Endpoint `GET /api/v1/poll-status` no tiene auth. Expone estado del colector.
**CWE:** CWE-200 (Information Exposure)

### H-003: News endpoints públicos (BAJO)
**Archivo:** `src/routes/news.ts:9,19`
**Descripción:** GET /api/v1/news y GET /api/v1/news/status son públicos. Posiblemente intencional para mostrar noticias, pero permite enumeración de artículos sin autenticación.
**CWE:** CWE-862 (Missing Authorization)

### H-004: Error handler expone mensajes internos (MEDIO)
**Archivo:** `src/index.ts:92-95`
**Descripción:** `reply.status(error.statusCode ?? 500).send({ error: error.message })` expone el mensaje de error original. Si ocurre un error de conexión a BD o error interno, el detalle se filtra al cliente.
**CWE:** CWE-209 (Information Exposure Through an Error Message)

### H-005: dangerouslySetInnerHTML en Reports (ALTO)
**Archivo:** `apps/dashboard/src/pages/reports/ReportsPage.tsx:304`
**Descripción:** Se usa `dangerouslySetInnerHTML` para renderizar contenido de reportes. Si el contenido incluye HTML de fuente no confiable (RSS feeds, input de usuario), es vector XSS.
**CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)

### H-006: JWT expira en 7 días (MEDIO)
**Archivo:** `src/index.ts:41`
**Descripción:** `expiresIn: "7d"` — ventana larga de validez. Sin refresh token rotation. Si un token se filtra por CORS anterior (F-001 corregido) sigue siendo válido 7 días.
**CWE:** CWE-613 (Insufficient Session Expiration)

### H-007: Sin rate-limit específico en login (BAJO)
**Descripción:** Rate-limit global de 300 req/min aplica a login también. No hay límite más restrictivo (ej: 5/min) para login que prevenga brute force.
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

### Corregidos desde pentest anterior
- ✅ F-001 CORS whitelist: `origin: ["http://127.0.0.1:5173", ...]`
- ✅ F-002 Auth middleware: `return` agregado en 401/403
- ✅ F-003 Encrypt/decrypt implementado en accounts + collector
- ✅ F-004 Security headers: CSP, X-Frame-Options, HSTS configurados
