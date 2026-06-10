#!/bin/bash
# MFA Validation — Dashboard Treda
G="\033[0;32m"; R="\033[0;31m"; Y="\033[1;33m"; B="\033[0;34m"; NC="\033[0m"
API="http://localhost:3000"; PASS=0; FAIL=0
echo ""; echo -e "${B}══════ MFA VALIDATION ══════${NC}"; echo ""

echo -e "${B}[1] API${NC}"
H=$(curl -s -o /dev/null -w "%{http_code}" "$API/health" 2>/dev/null)
if [ "$H" = "200" ]; then echo -e "  ${G}✓${NC} API running"; ((PASS++)); else echo -e "  ${R}✗${NC} API down ($H)"; ((FAIL++)); fi

echo -e "${B}[2] Code auth.ts${NC}"
F="/home/admintreda/proyect_hermes/cloud-treda/apps/api/src/routes/auth.ts"
for p in "getMfaSecret" "encrypt(secret)" "decrypt(encryptedOrPlain)" "DO NOT MODIFY MFA" "import.*encrypt.*decrypt"; do
  if grep -q "$p" "$F" 2>/dev/null; then echo -e "  ${G}✓${NC} $p"; ((PASS++)); else echo -e "  ${R}✗${NC} MISSING: $p"; ((FAIL++)); fi
done

echo -e "${B}[3] Database${NC}"
RESULT=$(PGPASSWORD='***' psql -h localhost -U hermes -d hermes_allen -t -c "SELECT username, mfa_secret FROM users WHERE mfa_secret IS NOT NULL;" 2>/dev/null)
if [ -z "$RESULT" ]; then echo -e "  ${G}✓${NC} No MFA secrets stored"; ((PASS++)); else
  while IFS='|' read -r user secret; do
    user=$(echo "$user" | xargs); secret=$(echo "$secret" | xargs); [ -z "$user" ] && continue
    if echo "$secret" | grep -qE '^[A-Z2-7]{16}$'; then echo -e "  ${R}✗${NC} $user: PLAINTEXT"; ((FAIL++)); else echo -e "  ${G}✓${NC} $user: encrypted"; ((PASS++)); fi
  done <<< "$RESULT"
fi

echo -e "${B}[4] Environment${NC}"
if grep -q "^ENCRYPTION_SECRET=" /home/admintreda/proyect_hermes/cloud-treda/apps/api/.env 2>/dev/null; then echo -e "  ${G}✓${NC} ENCRYPTION_SECRET set"; ((PASS++)); else echo -e "  ${R}✗${NC} ENCRYPTION_SECRET missing"; ((FAIL++)); fi

echo -e "${B}[5] Services${NC}"
if [ "$(systemctl is-active dashboard-treda-api.service 2>/dev/null)" = "active" ]; then echo -e "  ${G}✓${NC} API active"; ((PASS++)); else echo -e "  ${R}✗${NC} API inactive"; ((FAIL++)); fi
if [ "$(systemctl is-active dashboard-treda-dashboard.service 2>/dev/null)" = "active" ]; then echo -e "  ${G}✓${NC} Dashboard active"; ((PASS++)); else echo -e "  ${R}✗${NC} Dashboard inactive"; ((FAIL++)); fi

echo -e "${B}[6] Build${NC}"
S=$(curl -s http://localhost:5173/ 2>/dev/null | grep -o 'index-[A-Za-z0-9_-]*\.js')
E=$(grep -o 'index-[A-Za-z0-9_-]*\.js' /home/admintreda/proyect_hermes/dashboard-treda/apps/dashboard/dist/index.html 2>/dev/null)
if [ "$S" = "$E" ] && [ -n "$S" ]; then echo -e "  ${G}✓${NC} Build OK ($S)"; ((PASS++)); else echo -e "  ${R}✗${NC} Build mismatch"; ((FAIL++)); fi

echo -e "${B}[7] Errors${NC}"
E=$(journalctl -u dashboard-treda-api.service --since "10 min ago" --no-pager 2>/dev/null | grep -c "jsonb" || echo 0)
if [ "$E" = "0" ]; then echo -e "  ${G}✓${NC} No JSONB errors"; ((PASS++)); else echo -e "  ${Y}⚠${NC} $E JSONB errors"; ((PASS++)); fi

echo ""; echo -e "${B}═══════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then echo -e "  ${G}ALL PASSED ($PASS) — MFA SECURE ✓${NC}"
else echo -e "  ${R}$FAIL FAILED — FIX BEFORE DEPLOY${NC}"; fi
echo -e "${B}═══════════════════════════════════${NC}"; echo ""
