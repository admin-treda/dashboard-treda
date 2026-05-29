# Hermes Allen — Dashboard Unificado de Monitoreo Multi-Cloud

Plataforma moderna de monitoreo multi-cloud para gestionar cuentas **AWS**, **Azure** y **Microsoft 365** desde una interfaz web unificada.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js 20, Fastify, TypeScript |
| **Base de datos** | PostgreSQL 16 + Prisma ORM |
| **Cache/Cola** | Redis 7 + BullMQ |
| **Gráficos** | Recharts |
| **Estado** | Zustand + TanStack Query |
| **Despliegue** | Docker Compose |

## Paleta de Colores (Treda Solutions)

| Color | Hex | Uso |
|-------|-----|-----|
| Azul Marino | `#21286C` | Headers, fondos principales |
| Cian | `#00F5B8` | CTAs, elementos destacados |
| Azul Pervinca | `#5B78FF` | Iconos, gráficos |
| Azul Suave | `#E8F0FE` | Fondos de tarjetas |

## Estructura del Proyecto

```
hermes-allen/
├── apps/
│   ├── dashboard/          # Frontend React
│   └── api/               # Backend Fastify
├── packages/
│   ├── ui/                # Componentes compartidos
│   ├── types/             # Tipos TypeScript
│   └── utils/             # Utilidades comunes
├── docker/
│   └── docker-compose.yml
├── scripts/
│   ├── install.sh
│   ├── deploy.sh
│   └── uninstall.sh
├── pnpm-workspace.yaml
└── package.json
```

## Módulos

1. **Cuentas Cloud** — CRUD de cuentas AWS, Azure, M365 con wizard
2. **Seguridad/Eventos** — Dashboard de eventos con criticidad (CRÍTICO/ALTO/MEDIO/BAJO)
3. **Costos** — Gráficos por cuenta y servicio, alertas de presupuesto
4. **Informes** — Generación diaria/semanal, programación automática
5. **Notificaciones** — Canales SMTP y Telegram
6. **Configuración** — Usuarios, roles, tema dark/light

## Quick Start

```bash
# Requisitos: Docker y Docker Compose

cd hermes-allen
chmod +x scripts/*.sh

# Instalación interactiva
./scripts/install.sh

# O manual
cp .env.example .env
# Editar .env con tus valores
docker compose -f docker/docker-compose.yml up -d

# Acceder
# Dashboard: http://localhost:80
# API:       http://localhost:3000
```

## Scripts

- `./scripts/install.sh` — Instalación interactiva (guía paso a paso)
- `./scripts/deploy.sh` — Reconstruye y despliega cambios
- `./scripts/uninstall.sh` — Elimina contenedores, volúmenes e imágenes

## Licencia

MIT — Treda Solutions
