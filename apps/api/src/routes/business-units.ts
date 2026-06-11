import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function businessUnitRoutes(fastify: FastifyInstance) {
  // List all business units
  fastify.get('/', async (request, reply) => {
    const units = await prisma.businessUnit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            risks: true,
            soaControls: true,
            documents: true,
            audits: true,
            capas: true,
          }
        }
      }
    })

    const stats = {
      total: units.length,
      active: units.filter(u => u.status === 'ACTIVE').length,
      inactive: units.filter(u => u.status === 'INACTIVE').length,
    }

    return { units, stats }
  })

  // Get business unit by id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params
    const unit = await prisma.businessUnit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            risks: true,
            soaControls: true,
            documents: true,
            audits: true,
            capas: true,
          }
        }
      }
    })
    if (!unit) return reply.status(404).send({ error: 'Unidad de negocio no encontrada' })
    return unit
  })

  // Create business unit
  fastify.post('/', async (request, reply) => {
    const body = request.body as any
    const unit = await prisma.businessUnit.create({
      data: {
        name: body.name,
        description: body.description || '',
        industry: body.industry || '',
        logo: body.logo,
        status: body.status || 'ACTIVE',
      }
    })
    return reply.status(201).send(unit)
  })

  // Update business unit
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params
    const body = request.body as any
    const unit = await prisma.businessUnit.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        industry: body.industry,
        logo: body.logo,
        status: body.status,
      }
    })
    return unit
  })

  // Delete business unit
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params
    await prisma.businessUnit.delete({ where: { id } })
    return { success: true }
  })

  // Get ISO summary for a business unit
  fastify.get<{ Params: { id: string } }>('/:id/summary', async (request, reply) => {
    const { id } = request.params
    const unit = await prisma.businessUnit.findUnique({ where: { id } })
    if (!unit) return reply.status(404).send({ error: 'Unidad no encontrada' })

    const [isms, risks, soaControls, documents, audits, capas] = await Promise.all([
      prisma.iSMSDashboard.findFirst({ where: { businessUnitId: id } }),
      prisma.risk.findMany({ where: { businessUnitId: id } }),
      prisma.soAControl.findMany({ where: { businessUnitId: id } }),
      prisma.document.findMany({ where: { businessUnitId: id } }),
      prisma.internalAudit.findMany({ where: { businessUnitId: id } }),
      prisma.cAPA.findMany({ where: { businessUnitId: id } }),
    ])

    return {
      unit,
      isms,
      risks: {
        total: risks.length,
        critical: risks.filter(r => r.riskLevel === 'CRITICAL').length,
        open: risks.filter(r => r.status === 'OPEN').length,
        mitigated: risks.filter(r => r.status === 'MITIGATED').length,
      },
      soa: {
        total: soaControls.length,
        implemented: soaControls.filter(c => c.implementationStatus === 'IMPLEMENTED').length,
        partial: soaControls.filter(c => c.implementationStatus === 'PARTIAL').length,
      },
      documents: { total: documents.length },
      audits: { total: audits.length, completed: audits.filter(a => a.status === 'COMPLETED').length },
      capas: { total: capas.length, open: capas.filter(c => c.status === 'OPEN').length },
    }
  })
}
