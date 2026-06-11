import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function trainingRoutes(fastify: FastifyInstance) {
  // List courses
  fastify.get('/courses', async (request, reply) => {
    const { category, businessUnitId } = request.query as any
    const where: any = {}
    if (category) where.category = category
    if (businessUnitId) where.businessUnitId = businessUnitId

    const courses = await prisma.trainingCourse.findMany({
      where,
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' }
    })

    const stats = {
      total: courses.length,
      active: courses.filter(c => c.status === 'ACTIVE').length,
      required: courses.filter(c => c.required).length,
      totalEnrollments: courses.reduce((sum, c) => sum + (c._count.enrollments || 0), 0),
    }

    return { courses, stats }
  })

  // Get course by id
  fastify.get('/courses/:id', async (request, reply) => {
    const { id } = request.params as any
    const course = await prisma.trainingCourse.findUnique({
      where: { id },
      include: { enrollments: { orderBy: { enrolledAt: 'desc' } } }
    })
    if (!course) return reply.status(404).send({ error: 'Curso no encontrado' })
    return course
  })

  // Create course
  fastify.post('/courses', async (request, reply) => {
    const body = request.body as any
    const course = await prisma.trainingCourse.create({
      data: {
        businessUnitId: body.businessUnitId || null,
        title: body.title,
        description: body.description || '',
        category: body.category,
        durationMinutes: body.durationMinutes || 60,
        required: body.required || false,
        frequency: body.frequency,
        passingScore: body.passingScore || 80,
        soaControls: body.soaControls || [],
        status: body.status || 'ACTIVE',
      }
    })
    return reply.status(201).send(course)
  })

  // Update course
  fastify.put('/courses/:id', async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const course = await prisma.trainingCourse.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        durationMinutes: body.durationMinutes,
        required: body.required,
        frequency: body.frequency,
        passingScore: body.passingScore,
        soaControls: body.soaControls,
        status: body.status,
      }
    })
    return course
  })

  // Delete course
  fastify.delete('/courses/:id', async (request, reply) => {
    const { id } = request.params as any
    await prisma.trainingCourse.delete({ where: { id } })
    return { success: true }
  })

  // Enroll user
  fastify.post('/enroll', async (request, reply) => {
    const body = request.body as any
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        courseId: body.courseId,
        userId: body.userId,
        userName: body.userName || '',
        status: 'ENROLLED',
      }
    })
    return reply.status(201).send(enrollment)
  })

  // Update enrollment status
  fastify.put('/enrollments/:id', async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const updateData: any = { status: body.status }
    if (body.status === 'IN_PROGRESS') updateData.startedAt = new Date()
    if (body.status === 'COMPLETED') { updateData.completedAt = new Date(); updateData.score = body.score }

    const enrollment = await prisma.trainingEnrollment.update({
      where: { id },
      data: updateData
    })
    return enrollment
  })

  // List enrollments
  fastify.get('/enrollments', async (request, reply) => {
    const { userId, status, businessUnitId } = request.query as any
    const where: any = {}
    if (userId) where.userId = userId
    if (status) where.status = status
    if (businessUnitId) where.businessUnitId = businessUnitId

    const enrollments = await prisma.trainingEnrollment.findMany({
      where,
      include: { course: true },
      orderBy: { enrolledAt: 'desc' }
    })

    const stats = {
      total: enrollments.length,
      completed: enrollments.filter(e => e.status === 'COMPLETED').length,
      inProgress: enrollments.filter(e => e.status === 'IN_PROGRESS').length,
      pending: enrollments.filter(e => e.status === 'ENROLLED').length,
    }

    return { enrollments, stats }
  })

  // Seed default courses
  fastify.post('/seed', async (request, reply) => {
    const defaults = [
      { title: 'Concientización en Seguridad de la Información', description: 'Curso base sobre principios de seguridad de la información', category: 'SECURITY_AWARENESS', durationMinutes: 120, required: true, frequency: 'annual', soaControls: ['A.6.3'] },
      { title: 'Protección contra Phishing', description: 'Identificación y prevención de ataques de phishing', category: 'PHISHING', durationMinutes: 60, required: true, frequency: 'quarterly', soaControls: ['A.6.3', 'A.6.8'] },
      { title: 'Gestión de Contraseñas Seguras', description: 'Creación, almacenamiento y gestión de contraseñas seguras', category: 'PASSWORD_SECURITY', durationMinutes: 45, required: true, frequency: 'annual', soaControls: ['A.5.17', 'A.8.5'] },
      { title: 'Protección de Datos Personales', description: 'RGPD, Ley 1581 y manejo responsable de datos', category: 'DATA_PROTECTION', durationMinutes: 90, required: true, frequency: 'annual', soaControls: ['A.5.34'] },
      { title: 'Respuesta a Incidentes de Seguridad', description: 'Protocolos de respuesta ante incidentes de seguridad', category: 'INCIDENT_RESPONSE', durationMinutes: 90, required: true, frequency: 'annual', soaControls: ['A.5.24', 'A.5.25', 'A.5.26'] },
      { title: 'Seguridad en el Trabajo Remoto', description: 'Mejores prácticas para trabajar de forma segura en remoto', category: 'ROLE_SPECIFIC', durationMinutes: 60, required: false, soaControls: ['A.6.7'] },
      { title: 'Cifrado y Criptografía Básica', description: 'Principios de cifrado para empleados no técnicos', category: 'CRYPTOGRAPHY', durationMinutes: 60, required: false, soaControls: ['A.8.24'] },
      { title: 'Control de Acceso y Permisos', description: 'Gestión responsable de accesos y privilegios', category: 'ACCESS_CONTROL', durationMinutes: 60, required: true, frequency: 'annual', soaControls: ['A.5.15', 'A.5.16'] },
      { title: 'Cumplimiento Normativo ISO 27001', description: 'Introducción al SGSI y requisitos ISO 27001', category: 'COMPLIANCE', durationMinutes: 120, required: true, frequency: 'annual', soaControls: ['A.5.36'] },
      { title: 'Onboarding de Seguridad', description: 'Inducción de seguridad para nuevos empleados', category: 'ONBOARDING', durationMinutes: 90, required: true, soaControls: ['A.6.2', 'A.6.3'] },
    ]

    let created = 0
    for (const course of defaults) {
      try {
        await prisma.trainingCourse.create({ data: course as any })
        created++
      } catch {}
    }
    return { success: true, created, message: `${created} cursos creados` }
  })
}
