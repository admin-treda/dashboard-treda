import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function auditCAPARoutes(fastify: FastifyInstance) {
  // ═══════ INTERNAL AUDITS ═══════
  fastify.get('/audits', async (request, reply) => {
    const { status, businessUnitId } = request.query as any
    const where: any = {}
    if (status) where.status = status
    if (businessUnitId) where.businessUnitId = businessUnitId
    const audits = await prisma.internalAudit.findMany({ where, orderBy: { auditDate: 'desc' } })
    const stats = {
      total: audits.length,
      planned: audits.filter(a => a.status === 'PLANNED').length,
      inProgress: audits.filter(a => a.status === 'IN_PROGRESS').length,
      completed: audits.filter(a => a.status === 'COMPLETED').length,
      followUp: audits.filter(a => a.status === 'FOLLOW_UP').length,
      totalFindings: audits.reduce((s, a) => s + (Array.isArray(a.findings) ? a.findings.length : 0), 0),
      totalNCs: audits.reduce((s, a) => s + a.nonConformities, 0),
    }
    return { audits, stats }
  })

  fastify.get('/audits/:id', async (request, reply) => {
    const { id } = request.params as any
    const audit = await prisma.internalAudit.findUnique({ where: { id } })
    if (!audit) return reply.status(404).send({ error: 'Auditoría no encontrada' })
    return audit
  })

  fastify.post('/audits', async (request, reply) => {
    const body = request.body as any
    const audit = await prisma.internalAudit.create({
      data: {
        businessUnitId: body.businessUnitId || null,
        title: body.title,
        description: body.description || '',
        auditType: body.auditType,
        scope: body.scope || '',
        criteria: body.criteria,
        auditorName: body.auditorName,
        auditDate: new Date(body.auditDate),
        status: body.status || 'PLANNED',
        findings: body.findings || [],
        nonConformities: body.nonConformities || 0,
        opportunities: body.opportunities || 0,
        positives: body.positives || 0,
        reportUrl: body.reportUrl,
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
      }
    })
    return reply.status(201).send(audit)
  })

  fastify.put('/audits/:id', async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const audit = await prisma.internalAudit.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        auditType: body.auditType,
        scope: body.scope,
        criteria: body.criteria,
        auditorName: body.auditorName,
        auditDate: body.auditDate ? new Date(body.auditDate) : undefined,
        status: body.status,
        findings: body.findings,
        nonConformities: body.nonConformities,
        opportunities: body.opportunities,
        positives: body.positives,
        reportUrl: body.reportUrl,
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
      }
    })
    return audit
  })

  fastify.delete('/audits/:id', async (request, reply) => {
    const { id } = request.params as any
    await prisma.internalAudit.delete({ where: { id } })
    return { success: true }
  })

  // ═══════ CAPA ═══════
  fastify.get('/capa', async (request, reply) => {
    const { status, type, businessUnitId } = request.query as any
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (businessUnitId) where.businessUnitId = businessUnitId
    const items = await prisma.cAPA.findMany({ where, orderBy: { createdAt: 'desc' } })
    const stats = {
      total: items.length,
      open: items.filter(i => i.status === 'OPEN').length,
      inProgress: items.filter(i => i.status === 'IN_PROGRESS').length,
      implemented: items.filter(i => i.status === 'IMPLEMENTED').length,
      verified: items.filter(i => i.status === 'VERIFIED').length,
      closed: items.filter(i => i.status === 'CLOSED').length,
      corrective: items.filter(i => i.type === 'CORRECTIVE').length,
      preventive: items.filter(i => i.type === 'PREVENTIVE').length,
      improvement: items.filter(i => i.type === 'IMPROVEMENT').length,
      overdue: items.filter(i => i.status !== 'CLOSED' && i.status !== 'REJECTED' && i.dueDate && new Date(i.dueDate) < new Date()).length,
    }
    return { items, stats }
  })

  fastify.get('/capa/:id', async (request, reply) => {
    const { id } = request.params as any
    const item = await prisma.cAPA.findUnique({ where: { id } })
    if (!item) return reply.status(404).send({ error: 'CAPA no encontrada' })
    return item
  })

  fastify.post('/capa', async (request, reply) => {
    const body = request.body as any
    const item = await prisma.cAPA.create({
      data: {
        businessUnitId: body.businessUnitId || null,
        title: body.title,
        description: body.description || '',
        type: body.type,
        source: body.source || '',
        sourceId: body.sourceId,
        rootCause: body.rootCause,
        correctiveAction: body.correctiveAction,
        preventiveAction: body.preventiveAction,
        owner: body.owner,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status || 'OPEN',
        effectiveness: body.effectiveness,
      }
    })
    return reply.status(201).send(item)
  })

  fastify.put('/capa/:id', async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const updateData: any = {
      title: body.title,
      description: body.description,
      type: body.type,
      source: body.source,
      rootCause: body.rootCause,
      correctiveAction: body.correctiveAction,
      preventiveAction: body.preventiveAction,
      owner: body.owner,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: body.status,
      effectiveness: body.effectiveness,
    }
    if (body.status === 'VERIFIED') { updateData.verifiedBy = body.verifiedBy; updateData.verifiedAt = new Date() }
    if (body.status === 'CLOSED') { updateData.closedAt = new Date() }
    const item = await prisma.cAPA.update({ where: { id }, data: updateData })
    return item
  })

  fastify.delete('/capa/:id', async (request, reply) => {
    const { id } = request.params as any
    await prisma.cAPA.delete({ where: { id } })
    return { success: true }
  })
}