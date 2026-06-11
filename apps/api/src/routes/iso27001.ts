import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireRole } from '../middleware/auth'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════════
// ISO 27001:2022 Routes - SGSI, Riesgos, SoA
// ═══════════════════════════════════════════════════════════════

export async function iso27001Routes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════════════════════════════
  // ISMS Dashboard
  // ═══════════════════════════════════════════════════════════════
  
  fastify.get('/isms', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { businessUnitId } = request.query as any
    const where: any = {}
    if (businessUnitId) where.businessUnitId = businessUnitId
    const isms = await prisma.iSMSDashboard.findFirst({ where })
      return reply.send(isms || {})
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener ISMS dashboard' })
    }
  })

  fastify.post('/isms', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any
      const isms = await prisma.iSMSDashboard.create({
        data: {
          businessUnitId: body.businessUnitId || null,
          scope: body.scope || '',
          context: body.context || {},
          interestedParties: body.interestedParties || [],
          policyUrl: body.policyUrl,
          policyVersion: body.policyVersion,
          policyApprovedAt: body.policyApprovedAt ? new Date(body.policyApprovedAt) : null,
          policyApprovedBy: body.policyApprovedBy,
          overallCompliance: body.overallCompliance || 0,
          lastManagementReview: body.lastManagementReview ? new Date(body.lastManagementReview) : null,
          nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
        }
      })
      return reply.send(isms)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al crear ISMS dashboard' })
    }
  })

  fastify.put('/isms/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const body = request.body as any
      const isms = await prisma.iSMSDashboard.update({
        where: { id },
        data: {
          scope: body.scope,
          context: body.context,
          interestedParties: body.interestedParties,
          policyUrl: body.policyUrl,
          policyVersion: body.policyVersion,
          policyApprovedAt: body.policyApprovedAt ? new Date(body.policyApprovedAt) : null,
          policyApprovedBy: body.policyApprovedBy,
          overallCompliance: body.overallCompliance,
          lastManagementReview: body.lastManagementReview ? new Date(body.lastManagementReview) : null,
          nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
        }
      })
      return reply.send(isms)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al actualizar ISMS dashboard' })
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // Risk Management
  // ═══════════════════════════════════════════════════════════════

  fastify.get('/risks', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status, category, level } = request.query as any
      const where: any = {}
      if (status) where.status = status
      if (category) where.category = category
      if (level) where.riskLevel = level

      const risks = await prisma.risk.findMany({
        where,
        orderBy: { riskScore: 'desc' }
      })
      
      const stats = {
        total: risks.length,
        open: risks.filter(r => r.status === 'OPEN').length,
        inProgress: risks.filter(r => r.status === 'IN_PROGRESS').length,
        mitigated: risks.filter(r => r.status === 'MITIGATED').length,
        critical: risks.filter(r => r.riskLevel === 'CRITICAL').length,
        high: risks.filter(r => r.riskLevel === 'HIGH').length,
        medium: risks.filter(r => r.riskLevel === 'MEDIUM').length,
        low: risks.filter(r => r.riskLevel === 'LOW').length,
      }

      return reply.send({ risks, stats })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener riesgos' })
    }
  })

  fastify.get('/risks/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const risk = await prisma.risk.findUnique({ where: { id } })
      if (!risk) return reply.status(404).send({ error: 'Riesgo no encontrado' })
      return reply.send(risk)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener riesgo' })
    }
  })

  fastify.post('/risks', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any
      const riskScore = (body.likelihood || 1) * (body.impact || 1)
      const riskLevel = riskScore >= 20 ? 'CRITICAL' : riskScore >= 15 ? 'HIGH' : riskScore >= 8 ? 'MEDIUM' : 'LOW'

      const risk = await prisma.risk.create({
        data: {
          businessUnitId: body.businessUnitId || null,
          title: body.title,
          description: body.description || '',
          category: body.category,
          assetId: body.assetId,
          likelihood: body.likelihood || 1,
          impact: body.impact || 1,
          riskScore,
          riskLevel,
          treatmentOption: body.treatmentOption || 'MITIGATE',
          treatmentPlan: body.treatmentPlan,
          residualRisk: body.residualRisk,
          status: body.status || 'OPEN',
          owner: body.owner || '',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes,
        }
      })
      return reply.send(risk)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al crear riesgo' })
    }
  })

  fastify.put('/risks/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const body = request.body as any
      const riskScore = (body.likelihood || 1) * (body.impact || 1)
      const riskLevel = riskScore >= 20 ? 'CRITICAL' : riskScore >= 15 ? 'HIGH' : riskScore >= 8 ? 'MEDIUM' : 'LOW'

      const risk = await prisma.risk.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description,
          category: body.category,
          assetId: body.assetId,
          likelihood: body.likelihood,
          impact: body.impact,
          riskScore,
          riskLevel,
          treatmentOption: body.treatmentOption,
          treatmentPlan: body.treatmentPlan,
          residualRisk: body.residualRisk,
          status: body.status,
          owner: body.owner,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          mitigatedAt: body.status === 'MITIGATED' ? new Date() : null,
          notes: body.notes,
        }
      })
      return reply.send(risk)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al actualizar riesgo' })
    }
  })

  fastify.delete('/risks/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      await prisma.risk.delete({ where: { id } })
      return reply.send({ success: true })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al eliminar riesgo' })
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // Statement of Applicability (SoA)
  // ═══════════════════════════════════════════════════════════════

  fastify.get('/soa', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { category, status } = request.query as any
      const where: any = {}
      if (category) where.category = category
      if (status) where.implementationStatus = status

      const controls = await prisma.soAControl.findMany({
        where,
        orderBy: { controlId: 'asc' }
      })

      const stats = {
        total: controls.length,
        applicable: controls.filter(c => c.applicable).length,
        notApplicable: controls.filter(c => !c.applicable).length,
        implemented: controls.filter(c => c.implementationStatus === 'IMPLEMENTED').length,
        partial: controls.filter(c => c.implementationStatus === 'PARTIAL').length,
        notImplemented: controls.filter(c => c.implementationStatus === 'NOT_IMPLEMENTED').length,
        byCategory: {
          A5: controls.filter(c => c.category === 'A5_ORGANIZATIONAL').length,
          A6: controls.filter(c => c.category === 'A6_PEOPLE').length,
          A7: controls.filter(c => c.category === 'A7_PHYSICAL').length,
          A8: controls.filter(c => c.category === 'A8_TECHNOLOGICAL').length,
        }
      }

      return reply.send({ controls, stats })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener controles SoA' })
    }
  })

  fastify.get('/soa/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const control = await prisma.soAControl.findUnique({ where: { id } })
      if (!control) return reply.status(404).send({ error: 'Control no encontrado' })
      return reply.send(control)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener control' })
    }
  })

  fastify.put('/soa/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const body = request.body as any

      const control = await prisma.soAControl.update({
        where: { id },
        data: {
          applicable: body.applicable,
          justification: body.justification,
          implementationStatus: body.implementationStatus,
          implementationNotes: body.implementationNotes,
          owner: body.owner,
          evidenceIds: body.evidenceIds,
          relatedModule: body.relatedModule,
          lastReviewed: body.lastReviewed ? new Date(body.lastReviewed) : new Date(),
        }
      })
      return reply.send(control)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al actualizar control' })
    }
  })

  fastify.post('/soa/seed', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { businessUnitId } = request.body as any
      const controls = getISO27001Controls()
      
      for (const control of controls) {
        const data = { ...control, businessUnitId: businessUnitId || null }
        const existing = await prisma.soAControl.findFirst({
            where: { controlId: control.controlId, businessUnitId: businessUnitId || null }
          })
          if (!existing) {
            await prisma.soAControl.create({ data })
          }
      }

      return reply.send({ success: true, count: controls.length })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ error: 'Error al seed controles' })
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// ISO 27001:2022 - 93 Controles del Anexo A
// ═══════════════════════════════════════════════════════════════

function getISO27001Controls() {
  return [
    // A.5 Controles Organizacionales (37 controles)
    { controlId: 'A.5.1', title: 'Políticas de seguridad de la información', description: 'Las políticas de seguridad de la información deben ser definidas, aprobadas por la dirección, publicadas y comunicadas.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.2', title: 'Funciones y responsabilidades de seguridad de la información', description: 'Las funciones y responsabilidades de seguridad de la información deben ser definidas y asignadas.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.3', title: 'Segregación de funciones', description: 'Las funciones y áreas de responsabilidad conflictivas deben ser segregadas.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.4', title: 'Responsabilidades de la dirección', description: 'La dirección debe exigir que todo el personal cumpla con las políticas de seguridad.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.5', title: 'Contacto con autoridades', description: 'Se deben mantener contactos apropiados con las autoridades relevantes.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.6', title: 'Contacto con grupos de interés especial', description: 'Se deben mantener contactos apropiados con grupos de interés especial.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.7', title: 'Inteligencia de amenazas', description: 'Se debe recopilar y analizar información sobre amenazas de seguridad.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.8', title: 'Seguridad de la información en la gestión de proyectos', description: 'La seguridad de la información debe integrarse en la gestión de proyectos.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.9', title: 'Inventario de información y otros activos asociados', description: 'Se debe identificar un inventario de información y otros activos asociados.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.10', title: 'Uso aceptable de la información', description: 'Se deben identificar las reglas para el uso aceptable de la información.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.11', title: 'Devolución de activos', description: 'Se debe exigir que el personal y otros usuarios devuelvan los activos.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.12', title: 'Clasificación de la información', description: 'La información debe clasificarse de acuerdo con las necesidades de seguridad.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.13', title: 'Etiquetado de la información', description: 'Se debe desarrollar un procedimiento de etiquetado de acuerdo con la clasificación.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.14', title: 'Transferencia de información', description: 'Se deben establecer reglas para la transferencia de información.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.15', title: 'Control de acceso', description: 'Se deben establecer reglas para el control de acceso.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.16', title: 'Gestión de identidad', description: 'Se debe gestionar el ciclo de vida completo de las identidades.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.17', title: 'Información de autenticación', description: 'Se debe asignar y gestionar información de autenticación.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.18', title: 'Derechos de acceso', description: 'Se debe definir y revisar el acceso a la información.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.19', title: 'Seguridad de la información en acuerdos con proveedores', description: 'Se deben identificar y cumplir los requisitos de seguridad con proveedores.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.20', title: 'Consideración de seguridad en acuerdos de proveedores', description: 'Se deben abordar los aspectos de seguridad en los acuerdos.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.21', title: 'Gestión de seguridad de la información en la cadena TIC', description: 'Se deben identificar y gestionar los riesgos de la cadena TIC.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.22', title: 'Monitoreo y revisión de servicios de proveedores', description: 'Se deben monitorear y revisar los servicios de proveedores.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.23', title: 'Seguridad de la información para servicios en la nube', description: 'Se deben abordar los aspectos de seguridad para servicios en la nube.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.24', title: 'Planificación y preparación de incidentes', description: 'Se debe planificar y preparar la gestión de incidentes.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.25', title: 'Evaluación y decisión de eventos de seguridad', description: 'Se deben evaluar los eventos de seguridad y decidir si son incidentes.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.26', title: 'Respuesta a incidentes de seguridad', description: 'Se debe responder a los incidentes de seguridad de acuerdo con la documentación.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.27', title: 'Aprendizaje de incidentes', description: 'Se deben obtener conocimientos de los incidentes de seguridad.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.28', title: 'Recopilación de evidencia', description: 'Se deben recopilar evidencias para acciones legales o disciplinarias.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.29', title: 'Seguridad de la información durante una disrupción', description: 'Se deben planificar cómo mantener la seguridad durante una disrupción.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.30', title: 'Preparación de las TIC para la continuidad del negocio', description: 'Se deben preparar las TIC para la continuidad del negocio.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.31', title: 'Requisitos legales, estatutarios, reglamentarios y contractuales', description: 'Se deben identificar y cumplir los requisitos legales.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.32', title: 'Derechos de propiedad intelectual', description: 'Se deben implementar procedimientos para proteger los derechos de propiedad intelectual.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.33', title: 'Protección de registros', description: 'Se deben proteger los registros de acuerdo con los requisitos legales.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.34', title: 'Privacidad y protección de información personal', description: 'Se debe cumplir la legislación sobre privacidad y protección de datos.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.35', title: 'Revisión independiente de la seguridad de la información', description: 'Se debe revisar la seguridad de la información de forma independiente.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.36', title: 'Cumplimiento de políticas, reglas y estándares', description: 'Se debe revisar el cumplimiento de las políticas de seguridad.', category: 'A5_ORGANIZATIONAL' },
    { controlId: 'A.5.37', title: 'Procedimientos de operación documentados', description: 'Se deben documentar los procedimientos de operación.', category: 'A5_ORGANIZATIONAL' },

    // A.6 Controles de Personas (8 controles)
    { controlId: 'A.6.1', title: 'Selección', description: 'Se deben verificar las referencias de los candidatos.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.2', title: 'Términos y condiciones de empleo', description: 'Los contratos deben establecer las responsabilidades de seguridad.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.3', title: 'Concientización, educación y entrenamiento', description: 'El personal debe recibir concientización y entrenamiento.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.4', title: 'Proceso disciplinario', description: 'Se debe definir un proceso disciplinario para violaciones de seguridad.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.5', title: 'Responsabilidades después de la terminación o cambio', description: 'Se deben definir las responsabilidades después de la terminación.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.6', title: 'Acuerdos de confidencialidad', description: 'Se deben identificar los requisitos de confidencialidad.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.7', title: 'Trabajo remoto', description: 'Se deben implementar controles para el trabajo remoto.', category: 'A6_PEOPLE' },
    { controlId: 'A.6.8', title: 'Reporte de eventos de seguridad', description: 'Se debe requerir que el personal reporte eventos de seguridad.', category: 'A6_PEOPLE' },

    // A.7 Controles Físicos (14 controles)
    { controlId: 'A.7.1', title: 'Perímetros de seguridad', description: 'Se deben definir y usar perímetros de seguridad.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.2', title: 'Entradas físicas', description: 'Las áreas seguras deben tener entradas apropiadas.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.3', title: 'Oficinas, salas y áreas seguras', description: 'Se debe diseñar y aplicar la seguridad física.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.4', title: 'Monitoreo de seguridad física', description: 'Se deben monitorear las áreas seguras.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.5', title: 'Protección contra amenazas físicas y ambientales', description: 'Se debe proteger contra amenazas físicas y ambientales.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.6', title: 'Trabajo en áreas seguras', description: 'Se deben diseñar y aplicar controles para el trabajo en áreas seguras.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.7', title: 'Escritorio y pantalla limpios', description: 'Se deben aplicar reglas para escritorios y pantallas limpios.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.8', title: 'Ubicación y equipamiento de equipos', description: 'Se deben ubicar los equipos para minimizar riesgos.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.9', title: 'Seguridad de los activos fuera de las instalaciones', description: 'Se deben proteger los activos fuera de las instalaciones.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.10', title: 'Medios de almacenamiento', description: 'Se deben establecer procedimientos para medios de almacenamiento.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.11', title: 'Servicios de apoyo', description: 'Se deben proteger los servicios de apoyo.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.12', title: 'Seguridad del cableado', description: 'Se deben proteger los cables de alimentación y telecomunicaciones.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.13', title: 'Mantenimiento de equipos', description: 'Se debe mantener correctamente los equipos.', category: 'A7_PHYSICAL' },
    { controlId: 'A.7.14', title: 'Eliminación o reutilización segura de equipos', description: 'Se debe eliminar o reutilizar los equipos de forma segura.', category: 'A7_PHYSICAL' },

    // A.8 Controles Tecnológicos (34 controles)
    { controlId: 'A.8.1', title: 'Terminales de usuario', description: 'Se deben proteger los terminales de usuario.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.2', title: 'Derechos de acceso privilegiado', description: 'Se deben restringir y controlar los derechos de acceso privilegiado.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.3', title: 'Restricción de acceso a la información', description: 'Se debe restringir el acceso a la información.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.4', title: 'Acceso al código fuente', description: 'Se debe restringir el acceso al código fuente.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.5', title: 'Autenticación segura', description: 'Se deben usar técnicas de autenticación segura.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.6', title: 'Gestión de capacidad', description: 'Se debe monitorear y ajustar el uso de recursos.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.7', title: 'Protección contra malware', description: 'Se deben implementar controles contra malware.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.8', title: 'Gestión de vulnerabilidades técnicas', description: 'Se debe obtener información sobre vulnerabilidades técnicas.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.9', title: 'Gestión de configuración', description: 'Se deben establecer configuraciones de seguridad.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.10', title: 'Eliminación de información', description: 'Se debe eliminar la información cuando ya no se requiera.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.11', title: 'Enmascaramiento de datos', description: 'Se deben usar técnicas de enmascaramiento de datos.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.12', title: 'Prevención de fuga de datos', description: 'Se deben implementar controles contra la fuga de datos.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.13', title: 'Respaldo de información', description: 'Se deben respaldar los datos de acuerdo con la política.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.14', title: 'Redundancia de instalaciones de procesamiento', description: 'Se deben implementar redundancias.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.15', title: 'Registro de eventos', description: 'Se deben generar y almacenar registros de eventos.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.16', title: 'Actividades de monitoreo', description: 'Se deben monitorear los sistemas y redes.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.17', title: 'Sincronización de relojes', description: 'Se deben sincronizar los relojes de los sistemas.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.18', title: 'Utilidades privilegiadas', description: 'Se deben restringir las utilidades privilegiadas.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.19', title: 'Instalación de software en sistemas operacionales', description: 'Se deben controlar las instalaciones de software.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.20', title: 'Seguridad de redes', description: 'Se deben asegurar las redes.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.21', title: 'Seguridad de los servicios de red', description: 'Se deben identificar y usar mecanismos de seguridad.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.22', title: 'Segregación de redes', description: 'Se deben segregar las redes.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.23', title: 'Filtrado web', description: 'Se debe filtrar el tráfico web.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.24', title: 'Criptografía', description: 'Se deben definir reglas para el uso de criptografía.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.25', title: 'Ciclo de vida de desarrollo seguro', description: 'Se deben establecer reglas para el desarrollo seguro.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.26', title: 'Requisitos de seguridad en aplicaciones', description: 'Se deben identificar y evaluar los requisitos de seguridad.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.27', title: 'Pruebas organizacionales, operacionales y técnicas', description: 'Se deben realizar pruebas de seguridad.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.28', title: 'Desarrollo externalizado', description: 'Se deben dirigir y supervisar los desarrollos externalizados.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.29', title: 'Pruebas de seguridad en desarrollo y aceptación', description: 'Se deben realizar pruebas de seguridad en desarrollo y aceptación.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.30', title: 'Desarrollo externalizado', description: 'Se deben acordar y documentar los requisitos de seguridad.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.31', title: 'Pruebas de separación', description: 'Se deben separar los entornos de desarrollo, prueba y producción.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.32', title: 'Gestión de cambios', description: 'Se deben controlar los cambios en sistemas y operaciones.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.33', title: 'Datos de prueba', description: 'Se deben seleccionar y proteger los datos de prueba.', category: 'A8_TECHNOLOGICAL' },
    { controlId: 'A.8.34', title: 'Protección de sistemas de auditoría', description: 'Se deben proteger los sistemas de auditoría.', category: 'A8_TECHNOLOGICAL' },
  ]
}