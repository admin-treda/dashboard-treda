# Hermes Allen API

Backend Fastify para el proyecto Hermes Allen.

## Estructura

- `src/index.ts` - Servidor Fastify
- `src/config/` - Variables de entorno
- `src/middleware/` - Auth JWT y validación Zod
- `src/routes/` - Endpoints REST
- `src/services/` - Encriptación, notificaciones, reportes, colas
- `prisma/schema.prisma` - Modelos de datos

## Scripts

```bash
npm install
npx prisma generate
npm run dev
```

## Variables de entorno

Ver `.env.example`.
