#!/bin/bash
# Dashboard Treda MFA Test Script
API="http://localhost:3000"
G="\033[0;32m"; R="\033[0;31m"; Y="\033[1;33m"; NC="\033[0m"

echo "═══ DASHBOARD TREDA — MFA TEST ═══"

# 1. Health
echo -n "1. Health: "
S=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
[ "$S" = "200" ] && echo -e "${G}OK${NC}" || { echo -e "${R}FAIL${NC}"; exit 1; }

# 2. Login
echo -n "2. Login: "
RESP=$(curl -s -X POST "$API/api/v1/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin123!"}')
TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$TOKEN" ] && echo -e "${G}OK${NC}" || { echo -e "${R}FAIL${NC}"; exit 1; }

# 3. MFA Status
echo -n "3. MFA: "
MFA=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('mfaEnabled',False))" 2>/dev/null)
echo "$MFA"

# 4. Setup MFA
echo -n "4. MFA Setup: "
SETUP=$(curl -s -X POST "$API/api/v1/auth/mfa/setup" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}')
SECRET=$(echo "$SETUP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('secret',''))" 2>/dev/null)
if [ -n "$SECRET" ] && [ ${#SECRET} -eq 16 ]; then
  echo -e "${G}OK${NC} ($SECRET)"
else
  echo -e "${R}FAIL${NC} — $SETUP"
fi

# 5. Generate TOTP
echo -n "5. TOTP Gen: "
if [ -n "$SECRET" ]; then
  CODE=$(cd /home/admintreda/proyect_hermes/cloud-treda/apps/api && node -e "
const c=require('crypto');function d(e){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';const cl=e.replace(/[=\\s]/g,'').toUpperCase();let b='';for(const ch of cl){const v=a.indexOf(ch);if(v===-1)continue;b+=v.toString(2).padStart(5,'0');}const bs=new Uint8Array(Math.floor(b.length/8));for(let i=0;i<bs.length;i++)bs[i]=parseInt(b.slice(i*8,i*8+8),2);return Buffer.from(bs);}const k=d('$SECRET');const t=Math.floor(Date.now()/1000/30);const buf=Buffer.alloc(8);buf.writeUInt32BE(0,0);buf.writeUInt32BE(t,4);const h=c.createHmac('sha1',k);h.update(buf);const hash=h.digest();const o=hash[hash.length-1]&0x0f;const code=(((hash[o]&0x7f)<<24)|((hash[o+1]&0xff)<<16)|((hash[o+2]&0xff)<<8)|(hash[o+3]&0xff))%1000000;process.stdout.write(code.toString().padStart(6,'0'));
" 2>/dev/null)
  [ -n "$CODE" ] && echo -e "${G}OK${NC} ($CODE)" || echo -e "${R}FAIL${NC}"
else
  echo -e "${R}SKIP${NC}"
fi

# 6. Verify MFA
echo -n "6. MFA Verify: "
if [ -n "$CODE" ]; then
  VR=$(curl -s -X POST "$API/api/v1/auth/mfa/verify" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"code\":\"$CODE\"}")
  SUCC=$(echo "$VR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  [ "$SUCC" = "True" ] && echo -e "${G}OK${NC}" || echo -e "${R}FAIL${NC} — $VR"
else
  echo -e "${R}SKIP${NC}"
fi

# 7. Login with MFA required
echo -n "7. Login+MFA: "
MF=$(curl -s -X POST "$API/api/v1/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin123!"}')
MR=$(echo "$MF" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mfaRequired',False))" 2>/dev/null)
[ "$MR" = "True" ] && echo -e "${G}OK${NC} (MFA required)" || echo -e "${Y}WARN${NC} (MFA not enforced)"

# 8. Full MFA Login
echo -n "8. Full Login: "
if [ -n "$SECRET" ]; then
  FC=$(cd /home/admintreda/proyect_hermes/cloud-treda/apps/api && node -e "
const c=require('crypto');function d(e){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';const cl=e.replace(/[=\\s]/g,'').toUpperCase();let b='';for(const ch of cl){const v=a.indexOf(ch);if(v===-1)continue;b+=v.toString(2).padStart(5,'0');}const bs=new Uint8Array(Math.floor(b.length/8));for(let i=0;i<bs.length;i++)bs[i]=parseInt(b.slice(i*8,i*8+8),2);return Buffer.from(bs);}const k=d('$SECRET');const t=Math.floor(Date.now()/1000/30);const buf=Buffer.alloc(8);buf.writeUInt32BE(0,0);buf.writeUInt32BE(t,4);const h=c.createHmac('sha1',k);h.update(buf);const hash=h.digest();const o=hash[hash.length-1]&0x0f;const code=(((hash[o]&0x7f)<<24)|((hash[o+1]&0xff)<<16)|((hash[o+2]&0xff)<<8)|(hash[o+3]&0xff))%1000000;process.stdout.write(code.toString().padStart(6,'0'));
" 2>/dev/null)
  FR=$(curl -s -X POST "$API/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"Admin123!\",\"mfaCode\":\"$FC\"}")
  FT=$(echo "$FR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  [ -n "$FT" ] && echo -e "${G}OK${NC}" || echo -e "${R}FAIL${NC}"
else
  echo -e "${R}SKIP${NC}"
fi

# 9. Audit Log
echo -n "9. Audit: "
AR=$(curl -s "$API/api/v1/auth/audit-logs?limit=1" -H "Authorization: Bearer $TOKEN")
AE=$(echo "$AR" | python3 -c "import sys,json; print('error' in json.load(sys.stdin))" 2>/dev/null)
[ "$AE" = "False" ] && echo -e "${G}OK${NC}" || echo -e "${R}FAIL${NC}"

echo "═══ TESTS DONE ═══"
