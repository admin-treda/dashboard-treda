import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireRole } from '../middleware/auth'

const prisma = new PrismaClient()

export default async function vulnRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / — List all vulnerabilities from pentest results
  fastify.get('/', { preHandler: [requireRole('admin', 'analyst', 'viewer')] }, async () => {
    const results = await prisma.pentestResult.findMany({
      orderBy: { createdAt: 'desc' },
      include: { scan: { select: { id: true, url: true, createdAt: true } } },
    })

    // Transform pentest results into vulnerability format
    const vulns = results.map((r: any) => ({
      id: r.id,
      title: r.name,
      severity: r.severity?.toLowerCase() || 'info',
      status: r.status || 'open',
      tool: r.tool,
      description: r.description,
      reference: r.reference,
      tags: r.tags,
      scanUrl: r.scan?.url,
      createdAt: r.createdAt,
    }))

    const stats = {
      total: vulns.length,
      open: vulns.filter((v: any) => v.status === 'open').length,
      remediated: vulns.filter((v: any) => v.status === 'remediated').length,
      critical: vulns.filter((v: any) => v.severity === 'critical').length,
    }

    return { vulns, stats }
  })

  // PATCH /:id — Update vulnerability status
  fastify.patch('/:id', { preHandler: [requireRole('admin', 'analyst')] }, async (request) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    
    await prisma.pentestResult.update({
      where: { id },
      data: { status },
    })

    return { success: true }
  })
}
