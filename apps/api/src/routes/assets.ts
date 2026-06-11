import type { FastifyInstance } from 'fastify'
import { requireRole } from '../middleware/auth'

let assets: any[] = []
let nextId = 1

export default async function assetRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: [requireRole('admin', 'analyst', 'viewer')] }, async () => {
    const byType: Record<string, number> = {}
    let totalCost = 0
    for (const a of assets) {
      byType[a.type] = (byType[a.type] || 0) + 1
      totalCost += Number(a.costPerMonth) || 0
    }
    return { assets, stats: { total: assets.length, byType, totalCost } }
  })

  fastify.post('/', { preHandler: [requireRole('admin', 'analyst')] }, async (request) => {
    const body = request.body as any
    const asset = {
      id: String(nextId++),
      name: body.name,
      type: body.type || 'server',
      provider: body.provider || 'AWS',
      region: body.region || '',
      tags: body.tags || '',
      costPerMonth: body.costPerMonth || null,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    assets.push(asset)
    return asset
  })

  fastify.delete('/:id', { preHandler: [requireRole('admin', 'analyst')] }, async (request) => {
    const { id } = request.params as { id: string }
    assets = assets.filter(a => a.id !== id)
    return { success: true }
  })
}
