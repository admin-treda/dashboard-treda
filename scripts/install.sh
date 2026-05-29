#!/usr/bin/env bash
# ============================================================
#  Hermes Allen - Install Script
#  Treda Solutions
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.yml"

# --------------------------------------------------
# Colors (Treda Solutions branding)
# --------------------------------------------------
N='\033[0;38;5;18m'
C='\033[0;36m'
B='\033[1;34m'
Y='\033[1;33m'
G='\033[1;32m'
R='\033[0;31m'
W='\033[1;37m'
RST='\033[0m'

# --------------------------------------------------
# Helpers
# --------------------------------------------------
banner() {
  echo -e "${N}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                                                              ║"
  echo "║           ██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗║"
  echo "║           ██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝║"
  echo "║           ███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗║"
  echo "║           ██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║║"
  echo "║           ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║║"
  echo "║           ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝║"
  echo "║                                                              ║"
  echo "║                ALLEN  -  Cloud Intelligence Platform         ║"
  echo "║                                                              ║"
  echo "║                      Treda Solutions                         ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${RST}"
}

info()    { echo -e "${C}[INFO]${RST}  $*"; }
success() { echo -e "${G}[OK]${RST}    $*"; }
warn()    { echo -e "${Y}[WARN]${RST}  $*"; }
error()   { echo -e "${R}[ERROR]${RST} $*"; }

ask() {
  local prompt="$1"
  local default="${2:-}"
  local response
  if [[ -n "$default" ]]; then
    read -rp "$(echo -e "${W}${prompt}${RST} [${C}${default}${RST}]: ")" response
    echo "${response:-$default}"
  else
    read -rp "$(echo -e "${W}${prompt}${RST}: ")" response
    echo "$response"
  fi
}

ask_secret() {
  local prompt="$1"
  local response
  read -rsp "$(echo -e "${W}${prompt}${RST}: ")" response
  echo
  echo "$response"
}

# --------------------------------------------------
# Preflight Checks
# --------------------------------------------------
preflight() {
  info "Checking prerequisites..."

  if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Please install Docker first:"
    echo "       https://docs.docker.com/get-docker/"
    exit 1
  fi
  success "Docker found: $(docker --version)"

  if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
  elif docker-compose version &>/dev/null; then
    COMPOSE_CMD="docker-compose"
  else
    error "Docker Compose is not installed. Please install it first:"
    echo "       https://docs.docker.com/compose/install/"
    exit 1
  fi
  success "Docker Compose found"
}

# --------------------------------------------------
# Environment Setup
# --------------------------------------------------
setup_env() {
  local env_file="$PROJECT_DIR/.env"

  if [[ -f "$env_file" ]]; then
    warn ".env already exists at $env_file"
    local overwrite
    overwrite=$(ask "Overwrite existing .env? (yes/no)" "no")
    if [[ "$overwrite" != "yes" ]]; then
      info "Keeping existing .env"
      return
    fi
  fi

  info "Creating environment configuration..."
  echo

  local db_user db_pass db_name jwt_secret smtp_host smtp_port smtp_user smtp_pass telegram_token

  db_user=$(ask "PostgreSQL Username" "hermes")
  db_pass=$(ask_secret "PostgreSQL Password")
  while [[ -z "$db_pass" ]]; do
    warn "Password cannot be empty"
    db_pass=$(ask_secret "PostgreSQL Password")
  done

  db_name=$(ask "PostgreSQL Database Name" "hermes_allen")
  jwt_secret=$(ask_secret "JWT Secret Key (min 32 chars recommended)")
  while [[ "${#jwt_secret}" -lt 16 ]]; do
    warn "JWT Secret should be at least 16 characters"
    jwt_secret=$(ask_secret "JWT Secret Key")
  done

  echo
  info "Optional SMTP configuration (press Enter to skip)"
  smtp_host=$(ask "SMTP Host" "")
  smtp_port=$(ask "SMTP Port" "587")
  smtp_user=$(ask "SMTP User" "")
  if [[ -n "$smtp_user" ]]; then
    smtp_pass=$(ask_secret "SMTP Password")
  fi
  telegram_token=$(ask "Telegram Bot Token (optional)" "")

  local db_url
  db_url="postgresql://${db_user}:${db_pass}@postgres:5432/${db_name}?schema=public"

  {
    echo "# ============================================"
    echo "# Hermes Allen - Environment Configuration"
    echo "# Treda Solutions"
    echo "# ============================================"
    echo ""
    echo "# General"
    echo "NODE_ENV=production"
    echo "API_PORT=3000"
    echo ""
    echo "# PostgreSQL Database"
    echo "POSTGRES_USER=${db_user}"
    echo "POSTGRES_PASSWORD=${db_pass}"
    echo "POSTGRES_DB=${db_name}"
    echo "DATABASE_URL=${db_url}"
    echo ""
    echo "# Redis"
    echo "REDIS_URL=redis://redis:6379"
    echo ""
    echo "# JWT Authentication"
    echo "JWT_SECRET=${jwt_secret}"
    echo "JWT_EXPIRES_IN=7d"
    echo ""
    echo "# SMTP / Email Notifications (optional)"
    echo "SMTP_HOST=${smtp_host}"
    echo "SMTP_PORT=${smtp_port}"
    echo "SMTP_USER=${smtp_user}"
    echo "SMTP_PASS=${smtp_pass}"
    echo ""
    echo "# Telegram Bot (optional)"
    echo "TELEGRAM_BOT_TOKEN=${telegram_token}"
    echo ""
    echo "# Branding Colors"
    echo "BRAND_PRIMARY_NAVY=#21286C"
    echo "BRAND_ACCENT_CYAN=#00F5B8"
    echo "BRAND_SECONDARY_BLUE=#5B78FF"
    echo "BRAND_SOFT_BLUE=#E8F0FE"
  } > "$env_file"

  chmod 600 "$env_file"
  success ".env created at $env_file"
}

# --------------------------------------------------
# Start Services
# --------------------------------------------------
start_services() {
  info "Building and starting services..."
  echo

  cd "$PROJECT_DIR/docker"
  $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$PROJECT_DIR/.env" up -d --build

  echo
  info "Waiting for services to be healthy..."
  local retries=30
  while [[ $retries -gt 0 ]]; do
    if docker inspect --format='{{.State.Health.Status}}' hermes-allen-api 2>/dev/null | grep -q "healthy"; then
      break
    fi
    echo -n "."
    sleep 2
    ((retries--))
  done
  echo

  if [[ $retries -eq 0 ]]; then
    warn "API healthcheck timed out, but services may still be starting..."
  else
    success "All services are healthy!"
  fi
}

# --------------------------------------------------
# Summary
# --------------------------------------------------
summary() {
  local ip
  ip=$(hostname -I | awk '{print $1}')

  echo
  echo -e "${N}╔══════════════════════════════════════════════════════════════╗${RST}"
  echo -e "${N}║${RST}               ${G}INSTALLATION COMPLETE${RST}                         ${N}║${RST}"
  echo -e "${N}╠══════════════════════════════════════════════════════════════╣${RST}"
  echo -e "${N}║${RST}  ${C}Dashboard:${RST}  http://${ip}/                                      ${N}║${RST}"
  echo -e "${N}║${RST}  ${C}API:${RST}        http://${ip}:3000/health                         ${N}║${RST}"
  echo -e "${N}║${RST}  ${C}PostgreSQL:${RST} localhost:5432                                  ${N}║${RST}"
  echo -e "${N}║${RST}  ${C}Redis:${RST}      localhost:6379                                  ${N}║${RST}"
  echo -e "${N}╚══════════════════════════════════════════════════════════════╝${RST}"
  echo
  info "To view logs:     cd docker && ${COMPOSE_CMD} logs -f"
  info "To stop:          cd docker && ${COMPOSE_CMD} down"
  info "To uninstall:     ./scripts/uninstall.sh"
  echo
}

# --------------------------------------------------
# Main
# --------------------------------------------------
main() {
  banner
  preflight
  setup_env
  start_services
  summary
}

main "$@"
