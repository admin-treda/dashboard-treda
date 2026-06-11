import type { FastifyInstance } from 'fastify'
import { requireRole } from '../middleware/auth'

// In-memory compliance store (resets on restart — can be moved to DB later)
const complianceStore: Record<string, Record<string, { status: string; lastChecked: string }>> = {}

export default async function complianceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: [requireRole('admin', 'analyst', 'viewer')] }, async (request) => {
    const { framework } = request.query as { framework?: string }
    const fw = framework || 'cis'
    const stored = complianceStore[fw] || {}
    return { framework: fw, checks: Object.entries(stored).map(([id, data]) => ({ id: `${fw}-${id}`, controlId: id, ...data })) }
  })

  fastify.patch('/:id', { preHandler: [requireRole('admin', 'analyst')] }, async (request) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    // Parse framework from id like "cis-CIS-1"
    const parts = id.split('-')
    const framework = parts[0]
    const controlId = parts.slice(1).join('-')
    if (!complianceStore[framework]) complianceStore[framework] = {}
    complianceStore[framework][controlId] = { status, lastChecked: new Date().toISOString() }
    return { success: true }
  })
}
