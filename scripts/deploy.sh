#!/usr/bin/env bash
set -euo pipefail

BRAND='Hermes Allen - Multi-Cloud Dashboard'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${CYAN}[i]${NC} $1"; }
header(){ echo -e "\n${BOLD}━━━ $1 ━━━${NC}\n"; }

header "$BRAND — Deploy"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# 1. Verificar Docker
if ! command -v docker &>/dev/null; then
    error "Docker no está instalado. Instálalo primero."
    exit 1
fi

# 2. Cargar .env
if [ -f .env ]; then
    set -a; source .env; set +a
    log "Archivo .env cargado"
else
    warn "No se encontró .env. Usando valores por defecto de docker-compose.yml"
fi

# 3. Detener servicios anteriores
header "Deteniendo servicios anteriores"
docker compose -f docker/docker-compose.yml down --remove-orphans || true
log "Servicios detenidos"

# 4. Construir imágenes
header "Construyendo imágenes Docker"
DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.yml build --no-cache
log "Imágenes construidas"

# 5. Iniciar servicios
header "Iniciando servicios"
docker compose -f docker/docker-compose.yml up -d
log "Servicios iniciados"

# 6. Healthcheck
header "Verificando estado"
sleep 5

check_service() {
    local name=$1
    local max_retries=12
    for i in $(seq 1 $max_retries); do
        if docker compose -f docker/docker-compose.yml ps "$name" 2>/dev/null | grep -q "healthy"; then
            log "$name está saludable"
            return 0
        fi
        sleep 5
    done
    warn "$name no reportó salud después de 60s"
    return 1
}

check_service postgres
check_service redis
check_service api
check_service dashboard

# 7. Info
header "Despliegue completado"
echo -e "  ${BOLD}Dashboard:${NC}    http://localhost:80"
echo -e "  ${BOLD}API:${NC}          http://localhost:3000"
echo -e "  ${BOLD}Para logs:${NC}    docker compose -f docker/docker-compose.yml logs -f"
echo -e "  ${BOLD}Detener:${NC}      docker compose -f docker/docker-compose.yml down\n"

log "Hermes Allen está corriendo 🚀"
