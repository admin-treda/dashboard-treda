import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireRole } from '../middleware/auth'

const prisma = new PrismaClient()

// In-memory incidents store
let incidents: any[] = []
let nextId = 1

export default async function incidentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: [requireRole('admin', 'analyst', 'viewer')] }, async () => {
    const stats = {
      total: incidents.length,
      detected: incidents.filter(i => ['detected', 'triaged', 'in-progress'].includes(i.status)).length,
      resolved: incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length,
      avgResolution: 0,
    }
    return { incidents: incidents.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), stats }
  })

  fastify.post('/', { preHandler: [requireRole('admin', 'analyst')] }, async (request) => {
    const { title, severity, description } = request.body as any
    const incident = {
      id: String(nextId++),
      title,
      severity: severity || 'medium',
      status: 'detected',
      description: description || '',
      assignee: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    }
    incidents.push(incident)
    return incident
  })

  fastify.patch('/:id', { preHandler: [requireRole('admin', 'analyst')] }, async (request) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const inc = incidents.find(i => i.id === id)
    if (!inc) return { error: 'Not found' }
    if (body.status) {
      inc.status = body.status
      if (['resolved', 'closed'].includes(body.status)) inc.resolvedAt = new Date().toISOString()
    }
    if (body.assignee) inc.assignee = body.assignee
    return inc
  })
}
