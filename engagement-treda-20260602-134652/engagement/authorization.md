# Engagement Authorization

**Engagement ID:** TREDA-PENTEST-20260602-002
**Operator:** admintreda (Treda Solutions)
**Date opened:** 2026-06-02T13:46:52-05:00
**Engagement window:** 2026-06-02T13:46 through 2026-06-02T23:59

## Target

- Primary URL(s):
  - http://127.0.0.1:3000 (API)
  - http://127.0.0.1:5173 (Dashboard)
- Primary IP(s):
  - 127.0.0.1
- Hostnames covered:
  - localhost
  - 127.0.0.1
- Source code:
  - /home/admintreda/proyect_hermes/cloud-treda/

## Authorization Basis

- [x] Operator owns the application and infrastructure being tested.

## Out of Scope

- Cloud metadata endpoints (169.254.169.254, etc.)
- Destructive payloads (DROP, DELETE, file writes outside test directories) without per-payload approval
- External third-party APIs (AWS, Azure, M365)
- Production deployments outside localhost

## Constraints

- Rate limit: 200ms between requests per host
- PostgreSQL: only SELECT queries on structure

## Acknowledgement

By approving this engagement, the operator confirms:

1. The targets listed above are authorized for active testing.
2. Testing may produce HTTP 4xx/5xx responses, log noise, and alerts.
3. The operator is responsible for any consequences of testing.

**Operator:** admintreda
**Confirmed at:** 2026-06-02T13:46:52-05:00
