# ADR 0002 · Edición persistente local de pacientes

Estado: **propuesto; pendiente de aprobación de I3 y revisión del dueño antes de integrar el PR**.

Fecha: 2026-11-09. Relacionado con I3-09 y la auditoría integral solicitada.

Hospital mostraba éxito al editar datos únicamente en memoria. Para conservar su formulario existente se propone `PATCH /pacientes/:id`, con una extensión equivalente en Laboratorio. El JWT selecciona el repositorio y las validaciones Zod admiten exclusivamente campos de nombre y contacto; Hospital admite también los campos clínicos administrativos que ya existen en su formulario.

La extensión usa `actualizarPaciente` en los adaptadores de MongoDB y Firestore. No se agrega este método al puerto compartido: PostgreSQL conserva su extensión de contacto y Pediatría no obtiene permisos nuevos de edición. La identidad, institución y archivo no pueden modificarse por esta ruta.

Consecuencias: el éxito depende de una escritura confirmada; una lectura posterior recupera la edición, incluso tras reiniciar el backend. Los errores conservan el formato común. No hay cambios de esquema, migraciones, credenciales ni permisos de compartición.

La propuesta requiere revisión de I3 por la regla 6 de AGENTS.md. La implementación y sus pruebas quedan preparadas para esa revisión; este documento no declara una aprobación que no se ha recibido.
