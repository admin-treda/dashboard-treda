#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${CYAN}[i]${NC} $1"; }
header(){ echo -e "\n${BOLD}━━━ $1 ━━━${NC}\n"; }

header "Hermes Allen — Uninstall"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${RED}${BOLD}⚠  ATENCIÓN: Esto eliminará TODOS los datos y contenedores.${NC}"
read -p "$(echo -e ${YELLOW}"¿Estás seguro? (escribe 'yes' para confirmar): "${NC})" CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    info "Operación cancelada."
    exit 0
fi

header "Deteniendo y eliminando contenedores"
docker compose -f docker/docker-compose.yml down -v 2>/dev/null || true
log "Contenedores y volúmenes eliminados"

read -p "$(echo -e ${YELLOW}"¿Eliminar imágenes Docker de Hermes Allen? (y/N): "${NC})" REMOVE_IMAGES
if [[ "$REMOVE_IMAGES" =~ ^[Yy]$ ]]; then
    docker rmi hermes-allen-api hermes-allen-dashboard 2>/dev/null || true
    log "Imágenes eliminadas"
fi

header "Limpieza completada"
log "Hermes Allen ha sido desinstalado."
info "Los archivos del proyecto se conservan en: $PROJECT_DIR"
info "Para eliminar también el código fuente: rm -rf $PROJECT_DIR"
