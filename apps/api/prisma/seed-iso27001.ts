import { PrismaClient, SoACategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📋 Seedeando 93 controles ISO 27001:2022...\n')

  const controls = [
    // A.5 Controles Organizacionales (37 controles)
    { controlId: 'A.5.1', title: 'Políticas de seguridad de la información', description: 'Las políticas de seguridad de la información deben ser definidas, aprobadas por la dirección, publicadas y comunicadas.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.2', title: 'Funciones y responsabilidades de seguridad de la información', description: 'Las funciones y responsabilidades de seguridad de la información deben ser definidas y asignadas.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.3', title: 'Segregación de funciones', description: 'Las funciones y áreas de responsabilidad conflictivas deben ser segregadas.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.4', title: 'Responsabilidades de la dirección', description: 'La dirección debe exigir que todo el personal cumpla con las políticas de seguridad.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.5', title: 'Contacto con autoridades', description: 'Se deben mantener contactos apropiados con las autoridades relevantes.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.6', title: 'Contacto con grupos de interés especial', description: 'Se deben mantener contactos apropiados con grupos de interés especial.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.7', title: 'Inteligencia de amenazas', description: 'Se debe recopilar y analizar información sobre amenazas de seguridad.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.8', title: 'Seguridad de la información en la gestión de proyectos', description: 'La seguridad de la información debe integrarse en la gestión de proyectos.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.9', title: 'Inventario de información y otros activos asociados', description: 'Se debe identificar un inventario de información y otros activos asociados.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.10', title: 'Uso aceptable de la información', description: 'Se deben identificar las reglas para el uso aceptable de la información.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.11', title: 'Devolución de activos', description: 'Se debe exigir que el personal y otros usuarios devuelvan los activos.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.12', title: 'Clasificación de la información', description: 'La información debe clasificarse de acuerdo con las necesidades de seguridad.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.13', title: 'Etiquetado de la información', description: 'Se debe desarrollar un procedimiento de etiquetado de acuerdo con la clasificación.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.14', title: 'Transferencia de información', description: 'Se deben establecer reglas para la transferencia de información.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.15', title: 'Control de acceso', description: 'Se deben establecer reglas para el control de acceso.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.16', title: 'Gestión de identidad', description: 'Se debe gestionar el ciclo de vida completo de las identidades.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.17', title: 'Información de autenticación', description: 'Se debe asignar y gestionar información de autenticación.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.18', title: 'Derechos de acceso', description: 'Se debe definir y revisar el acceso a la información.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.19', title: 'Seguridad de la información en acuerdos con proveedores', description: 'Se deben identificar y cumplir los requisitos de seguridad con proveedores.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.20', title: 'Consideración de seguridad en acuerdos de proveedores', description: 'Se deben abordar los aspectos de seguridad en los acuerdos.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.21', title: 'Gestión de seguridad de la información en la cadena TIC', description: 'Se deben identificar y gestionar los riesgos de la cadena TIC.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.22', title: 'Monitoreo y revisión de servicios de proveedores', description: 'Se deben monitorear y revisar los servicios de proveedores.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.23', title: 'Seguridad de la información para servicios en la nube', description: 'Se deben abordar los aspectos de seguridad para servicios en la nube.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.24', title: 'Planificación y preparación de incidentes', description: 'Se debe planificar y preparar la gestión de incidentes.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.25', title: 'Evaluación y decisión de eventos de seguridad', description: 'Se deben evaluar los eventos de seguridad y decidir si son incidentes.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.26', title: 'Respuesta a incidentes de seguridad', description: 'Se debe responder a los incidentes de seguridad de acuerdo con la documentación.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.27', title: 'Aprendizaje de incidentes', description: 'Se deben obtener conocimientos de los incidentes de seguridad.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.28', title: 'Recopilación de evidencia', description: 'Se deben recopilar evidencias para acciones legales o disciplinarias.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.29', title: 'Seguridad de la información durante una disrupción', description: 'Se deben planificar cómo mantener la seguridad durante una disrupción.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.30', title: 'Preparación de las TIC para la continuidad del negocio', description: 'Se deben preparar las TIC para la continuidad del negocio.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.31', title: 'Requisitos legales, estatutarios, reglamentarios y contractuales', description: 'Se deben identificar y cumplir los requisitos legales.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.32', title: 'Derechos de propiedad intelectual', description: 'Se deben implementar procedimientos para proteger los derechos de propiedad intelectual.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.33', title: 'Protección de registros', description: 'Se deben proteger los registros de acuerdo con los requisitos legales.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.34', title: 'Privacidad y protección de información personal', description: 'Se debe cumplir la legislación sobre privacidad y protección de datos.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.35', title: 'Revisión independiente de la seguridad de la información', description: 'Se debe revisar la seguridad de la información de forma independiente.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.36', title: 'Cumplimiento de políticas, reglas y estándares', description: 'Se debe revisar el cumplimiento de las políticas de seguridad.', category: SoACategory.A5_ORGANIZATIONAL },
    { controlId: 'A.5.37', title: 'Procedimientos de operación documentados', description: 'Se deben documentar los procedimientos de operación.', category: SoACategory.A5_ORGANIZATIONAL },

    // A.6 Controles de Personas (8 controles)
    { controlId: 'A.6.1', title: 'Selección', description: 'Se deben verificar las referencias de los candidatos.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.2', title: 'Términos y condiciones de empleo', description: 'Los contratos deben establecer las responsabilidades de seguridad.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.3', title: 'Concientización, educación y entrenamiento', description: 'El personal debe recibir concientización y entrenamiento.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.4', title: 'Proceso disciplinario', description: 'Se debe definir un proceso disciplinario para violaciones de seguridad.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.5', title: 'Responsabilidades después de la terminación o cambio', description: 'Se deben definir las responsabilidades después de la terminación.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.6', title: 'Acuerdos de confidencialidad', description: 'Se deben identificar los requisitos de confidencialidad.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.7', title: 'Trabajo remoto', description: 'Se deben implementar controles para el trabajo remoto.', category: SoACategory.A6_PEOPLE },
    { controlId: 'A.6.8', title: 'Reporte de eventos de seguridad', description: 'Se debe requerir que el personal reporte eventos de seguridad.', category: SoACategory.A6_PEOPLE },

    // A.7 Controles Físicos (14 controles)
    { controlId: 'A.7.1', title: 'Perímetros de seguridad', description: 'Se deben definir y usar perímetros de seguridad.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.2', title: 'Entradas físicas', description: 'Las áreas seguras deben tener entradas apropiadas.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.3', title: 'Oficinas, salas y áreas seguras', description: 'Se debe diseñar y aplicar la seguridad física.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.4', title: 'Monitoreo de seguridad física', description: 'Se deben monitorear las áreas seguras.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.5', title: 'Protección contra amenazas físicas y ambientales', description: 'Se debe proteger contra amenazas físicas y ambientales.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.6', title: 'Trabajo en áreas seguras', description: 'Se deben diseñar y aplicar controles para el trabajo en áreas seguras.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.7', title: 'Escritorio y pantalla limpios', description: 'Se deben aplicar reglas para escritorios y pantallas limpios.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.8', title: 'Ubicación y equipamiento de equipos', description: 'Se deben ubicar los equipos para minimizar riesgos.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.9', title: 'Seguridad de los activos fuera de las instalaciones', description: 'Se deben proteger los activos fuera de las instalaciones.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.10', title: 'Medios de almacenamiento', description: 'Se deben establecer procedimientos para medios de almacenamiento.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.11', title: 'Servicios de apoyo', description: 'Se deben proteger los servicios de apoyo.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.12', title: 'Seguridad del cableado', description: 'Se deben proteger los cables de alimentación y telecomunicaciones.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.13', title: 'Mantenimiento de equipos', description: 'Se debe mantener correctamente los equipos.', category: SoACategory.A7_PHYSICAL },
    { controlId: 'A.7.14', title: 'Eliminación o reutilización segura de equipos', description: 'Se debe eliminar o reutilizar los equipos de forma segura.', category: SoACategory.A7_PHYSICAL },

    // A.8 Controles Tecnológicos (34 controles)
    { controlId: 'A.8.1', title: 'Terminales de usuario', description: 'Se deben proteger los terminales de usuario.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.2', title: 'Derechos de acceso privilegiado', description: 'Se deben restringir y controlar los derechos de acceso privilegiado.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.3', title: 'Restricción de acceso a la información', description: 'Se debe restringir el acceso a la información.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.4', title: 'Acceso al código fuente', description: 'Se debe restringir el acceso al código fuente.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.5', title: 'Autenticación segura', description: 'Se deben usar técnicas de autenticación segura.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.6', title: 'Gestión de capacidad', description: 'Se debe monitorear y ajustar el uso de recursos.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.7', title: 'Protección contra malware', description: 'Se deben implementar controles contra malware.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.8', title: 'Gestión de vulnerabilidades técnicas', description: 'Se debe obtener información sobre vulnerabilidades técnicas.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.9', title: 'Gestión de configuración', description: 'Se deben establecer configuraciones de seguridad.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.10', title: 'Eliminación de información', description: 'Se debe eliminar la información cuando ya no se requiera.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.11', title: 'Enmascaramiento de datos', description: 'Se deben usar técnicas de enmascaramiento de datos.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.12', title: 'Prevención de fuga de datos', description: 'Se deben implementar controles contra la fuga de datos.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.13', title: 'Respaldo de información', description: 'Se deben respaldar los datos de acuerdo con la política.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.14', title: 'Redundancia de instalaciones de procesamiento', description: 'Se deben implementar redundancias.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.15', title: 'Registro de eventos', description: 'Se deben generar y almacenar registros de eventos.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.16', title: 'Actividades de monitoreo', description: 'Se deben monitorear los sistemas y redes.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.17', title: 'Sincronización de relojes', description: 'Se deben sincronizar los relojes de los sistemas.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.18', title: 'Utilidades privilegiadas', description: 'Se deben restringir las utilidades privilegiadas.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.19', title: 'Instalación de software en sistemas operacionales', description: 'Se deben controlar las instalaciones de software.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.20', title: 'Seguridad de redes', description: 'Se deben asegurar las redes.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.21', title: 'Seguridad de los servicios de red', description: 'Se deben identificar y usar mecanismos de seguridad.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.22', title: 'Segregación de redes', description: 'Se deben segregar las redes.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.23', title: 'Filtrado web', description: 'Se debe filtrar el tráfico web.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.24', title: 'Criptografía', description: 'Se deben definir reglas para el uso de criptografía.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.25', title: 'Ciclo de vida de desarrollo seguro', description: 'Se deben establecer reglas para el desarrollo seguro.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.26', title: 'Requisitos de seguridad en aplicaciones', description: 'Se deben identificar y evaluar los requisitos de seguridad.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.27', title: 'Pruebas organizacionales, operacionales y técnicas', description: 'Se deben realizar pruebas de seguridad.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.28', title: 'Desarrollo externalizado', description: 'Se deben dirigir y supervisar los desarrollos externalizados.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.29', title: 'Pruebas de seguridad en desarrollo y aceptación', description: 'Se deben realizar pruebas de seguridad en desarrollo y aceptación.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.30', title: 'Desarrollo externalizado', description: 'Se deben acordar y documentar los requisitos de seguridad.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.31', title: 'Pruebas de separación', description: 'Se deben separar los entornos de desarrollo, prueba y producción.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.32', title: 'Gestión de cambios', description: 'Se deben controlar los cambios en sistemas y operaciones.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.33', title: 'Datos de prueba', description: 'Se deben seleccionar y proteger los datos de prueba.', category: SoACategory.A8_TECHNOLOGICAL },
    { controlId: 'A.8.34', title: 'Protección de sistemas de auditoría', description: 'Se deben proteger los sistemas de auditoría.', category: SoACategory.A8_TECHNOLOGICAL },
  ]

  let created = 0
  for (const control of controls) {
    try {
      await prisma.soAControl.upsert({
        where: { controlId: control.controlId },
        update: {},
        create: control
      })
      created++
    } catch (error) {
      console.error(`Error al crear ${control.controlId}:`, error)
    }
  }

  console.log(`\n✓ ${created} controles ISO 27001 seedeados exitosamente`)
  console.log('\n🎉 ISO 27001 setup completado!')
  console.log('\nPróximos pasos:')
  console.log('1. Ve a http://localhost:5173/soa para ver los controles')
  console.log('2. Ve a http://localhost:5173/risks para gestionar riesgos')
  console.log('3. Ve a http://localhost:5173/isms para el dashboard SGSI')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
