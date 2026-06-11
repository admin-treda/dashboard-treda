import { FastifyPluginAsync } from 'fastify'
import { PrismaClient, DocumentType, DocumentCategory, DocumentStatus } from '@prisma/client'

const prisma = new PrismaClient()

const documentsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /documents - Listar todos los documentos con filtros
  fastify.get('/', async (request, reply) => {
    try {
      const { type, category, status, search, businessUnitId } = request.query as any
      
      const where: any = {}
      if (type) where.type = type
      if (category) where.category = category
      if (status) where.status = status
      if (businessUnitId) where.businessUnitId = businessUnitId
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ]
      }

      const documents = await prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' }
      })

      const stats = {
        total: documents.length,
        byType: {
          POLICY: documents.filter(d => d.type === 'POLICY').length,
          PROCEDURE: documents.filter(d => d.type === 'PROCEDURE').length,
          WORK_INSTRUCTION: documents.filter(d => d.type === 'WORK_INSTRUCTION').length,
          RECORD: documents.filter(d => d.type === 'RECORD').length,
          PLAN: documents.filter(d => d.type === 'PLAN').length,
          REPORT: documents.filter(d => d.type === 'REPORT').length,
          MANUAL: documents.filter(d => d.type === 'MANUAL').length,
        },
        byStatus: {
          DRAFT: documents.filter(d => d.status === 'DRAFT').length,
          IN_REVIEW: documents.filter(d => d.status === 'IN_REVIEW').length,
          APPROVED: documents.filter(d => d.status === 'APPROVED').length,
          REJECTED: documents.filter(d => d.status === 'REJECTED').length,
          OBSOLETE: documents.filter(d => d.status === 'OBSOLETE').length,
        },
        approved: documents.filter(d => d.status === 'APPROVED').length,
        pendingReview: documents.filter(d => 
          d.nextReviewDate && new Date(d.nextReviewDate) <= new Date()
        ).length
      }

      return { documents, stats }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener documentos' })
    }
  })

  // GET /documents/:id - Obtener documento por ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const document = await prisma.document.findUnique({
        where: { id }
      })

      if (!document) {
        return reply.status(404).send({ error: 'Documento no encontrado' })
      }

      return document
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Error al obtener documento' })
    }
  })

  // POST /documents - Crear nuevo documento
  fastify.post('/', async (request, reply) => {
    try {
      const body = request.body as any
      
      const document = await prisma.document.create({
        data: {
          businessUnitId: body.businessUnitId || null,
          title: body.title,
          type: body.type as DocumentType,
          category: body.category as DocumentCategory,
          content: body.content,
          fileUrl: body.fileUrl,
          fileSize: body.fileSize,
          version: body.version || '1.0',
          status: (body.status as DocumentStatus) || 'DRAFT',
          owner: body.owner,
          reviewers: body.reviewers || [],
          approvedBy: body.approvedBy,
          approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
          nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : null,
          tags: body.tags || [],
          relatedSoA: body.relatedSoA || []
        }
      })

      return reply.status(201).send(document)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Error al crear documento' })
    }
  })

  // PUT /documents/:id - Actualizar documento
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const body = request.body as any

      const existing = await prisma.document.findUnique({ where: { id } })
      if (!existing) {
        return reply.status(404).send({ error: 'Documento no encontrado' })
      }

      const document = await prisma.document.update({
        where: { id },
        data: {
          title: body.title,
          type: body.type as DocumentType,
          category: body.category as DocumentCategory,
          content: body.content,
          fileUrl: body.fileUrl,
          fileSize: body.fileSize,
          version: body.version,
          status: body.status as DocumentStatus,
          owner: body.owner,
          reviewers: body.reviewers,
          approvedBy: body.approvedBy,
          approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
          nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : null,
          tags: body.tags,
          relatedSoA: body.relatedSoA
        }
      })

      return document
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Error al actualizar documento' })
    }
  })

  // DELETE /documents/:id - Eliminar documento
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const existing = await prisma.document.findUnique({ where: { id } })
      if (!existing) {
        return reply.status(404).send({ error: 'Documento no encontrado' })
      }

      await prisma.document.delete({
        where: { id }
      })

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Error al eliminar documento' })
    }
  })

  // POST /documents/seed - Seed documentos ISO 27001 requeridos
  fastify.post('/seed', async (request, reply) => {
    try {
      const requiredDocuments = [
        {
          title: 'Política de Seguridad de la Información',
          type: 'POLICY' as DocumentType,
          category: 'INFORMATION_SECURITY' as DocumentCategory,
          content: '# Política de Seguridad de la Información\n\n## 1. Objetivo\nEstablecer los lineamientos para la gestión de la seguridad de la información en Treda Solutions.\n\n## 2. Alcance\nAplica a todos los empleados, contratistas y terceros que accedan a los sistemas de información.\n\n## 3. Responsabilidades\n- Dirección: Aprobar y revisar la política\n- Equipo de TI: Implementar controles técnicos\n- Todos los empleados: Cumplir con la política\n\n## 4. Principios\n- Confidencialidad\n- Integridad\n- Disponibilidad\n\n## 5. Revisión\nEsta política se revisa anualmente o cuando ocurran cambios significativos.',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'policy', 'security'],
          relatedSoA: ['A.5.1', 'A.5.2']
        },
        {
          title: 'Política de Control de Acceso',
          type: 'POLICY' as DocumentType,
          category: 'ACCESS_CONTROL' as DocumentCategory,
          content: '# Política de Control de Acceso\n\n## 1. Objetivo\nDefinir los requisitos para el control de acceso a los sistemas de información.\n\n## 2. Principios\n- Mínimo privilegio\n- Necesidad de conocer\n- Segregación de funciones\n\n## 3. Requisitos\n- Autenticación multifactor (MFA)\n- Contraseñas complejas (mínimo 12 caracteres)\n- Revisión trimestral de accesos\n- Bloqueo automático después de 5 intentos fallidos',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'policy', 'access'],
          relatedSoA: ['A.5.15', 'A.5.16', 'A.5.17', 'A.5.18', 'A.8.2', 'A.8.3']
        },
        {
          title: 'Procedimiento de Gestión de Incidentes',
          type: 'PROCEDURE' as DocumentType,
          category: 'INCIDENT_MANAGEMENT' as DocumentCategory,
          content: '# Procedimiento de Gestión de Incidentes\n\n## 1. Objetivo\nEstablecer el proceso para gestionar incidentes de seguridad.\n\n## 2. Fases\n1. Detección y reporte\n2. Clasificación y priorización\n3. Contención\n4. Erradicación\n5. Recuperación\n6. Lecciones aprendidas\n\n## 3. Tiempos de respuesta\n- Crítico: 1 hora\n- Alto: 4 horas\n- Medio: 24 horas\n- Bajo: 72 horas',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'procedure', 'incident'],
          relatedSoA: ['A.5.24', 'A.5.25', 'A.5.26', 'A.5.27', 'A.5.28']
        },
        {
          title: 'Plan de Continuidad del Negocio',
          type: 'PLAN' as DocumentType,
          category: 'BUSINESS_CONTINUITY' as DocumentCategory,
          content: '# Plan de Continuidad del Negocio\n\n## 1. Objetivo\nGarantizar la continuidad de las operaciones críticas ante desastres.\n\n## 2. Análisis de Impacto (BIA)\n- RTO: 4 horas\n- RPO: 1 hora\n\n## 3. Estrategias\n- Backups en múltiples regiones\n- Sistemas redundantes\n- Plan de comunicación de crisis\n\n## 4. Pruebas\n- Simulacros semestrales\n- Revisión anual del plan',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'plan', 'bcdr'],
          relatedSoA: ['A.5.29', 'A.5.30']
        },
        {
          title: 'Procedimiento de Gestión de Riesgos',
          type: 'PROCEDURE' as DocumentType,
          category: 'RISK_MANAGEMENT' as DocumentCategory,
          content: '# Procedimiento de Gestión de Riesgos\n\n## 1. Objetivo\nIdentificar, evaluar y tratar los riesgos de seguridad.\n\n## 2. Metodología\n1. Identificación de activos\n2. Identificación de amenazas\n3. Evaluación de probabilidades e impacto\n4. Cálculo de riesgo (P × I)\n5. Tratamiento del riesgo\n\n## 3. Matriz de riesgo\n- Bajo: 1-4\n- Medio: 5-9\n- Alto: 10-16\n- Crítico: 17-25\n\n## 4. Revisión\nEvaluación anual de riesgos',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'procedure', 'risk'],
          relatedSoA: ['A.5.9', 'A.5.10', 'A.6.1.2', 'A.6.1.3']
        },
        {
          title: 'Política de Criptografía',
          type: 'POLICY' as DocumentType,
          category: 'CRYPTOGRAPHY' as DocumentCategory,
          content: '# Política de Criptografía\n\n## 1. Objetivo\nEstablecer los requisitos para el uso de criptografía.\n\n## 2. Algoritmos aprobados\n- AES-256 para datos en reposo\n- TLS 1.3 para datos en tránsito\n- SHA-256 para hashes\n- RSA 2048+ para firmas\n\n## 3. Gestión de claves\n- Rotación anual\n- Almacenamiento seguro (HSM/KMS)\n- Separación de duties',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'policy', 'crypto'],
          relatedSoA: ['A.8.24']
        },
        {
          title: 'Política de Seguridad en Relaciones con Proveedores',
          type: 'POLICY' as DocumentType,
          category: 'SUPPLIER_RELATIONSHIPS' as DocumentCategory,
          content: '# Política de Seguridad en Relaciones con Proveedores\n\n## 1. Objetivo\nGarantizar la seguridad de la información compartida con proveedores.\n\n## 2. Requisitos\n- Acuerdos de confidencialidad (NDA)\n- Cláusulas de seguridad en contratos\n- Auditorías periódicas\n- Evaluación de riesgos de terceros\n\n## 3. Monitoreo\n- Revisión anual de proveedores críticos\n- Indicadores de desempeño de seguridad',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'policy', 'supplier'],
          relatedSoA: ['A.5.19', 'A.5.20', 'A.5.21', 'A.5.22', 'A.5.23']
        },
        {
          title: 'Procedimiento de Clasificación de Activos',
          type: 'PROCEDURE' as DocumentType,
          category: 'ASSET_MANAGEMENT' as DocumentCategory,
          content: '# Procedimiento de Clasificación de Activos\n\n## 1. Objetivo\nClasificar los activos de información según su criticidad.\n\n## 2. Niveles de clasificación\n- Público: Sin restricciones\n- Interno: Solo empleados\n- Confidencial: Acceso restringido\n- Restringido: Alto secreto\n\n## 3. Criterios CIA\n- Confidencialidad\n- Integridad\n- Disponibilidad\n\n## 4. Inventario\nActualización trimestral del inventario de activos',
          version: '1.0',
          status: 'DRAFT' as DocumentStatus,
          tags: ['iso27001', 'procedure', 'assets'],
          relatedSoA: ['A.5.9', 'A.5.12', 'A.5.13', 'A.5.14']
        }
      ]

      let created = 0
      for (const doc of requiredDocuments) {
        try {
          await prisma.document.create({ data: doc })
          created++
        } catch (error) {
          fastify.log.error(`Error al crear documento "${doc.title}":`, error)
        }
      }

      return { 
        success: true, 
        created, 
        message: `${created} documentos ISO 27001 requeridos creados` 
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Error al seedear documentos' })
    }
  })
}

export default documentsRoutes
