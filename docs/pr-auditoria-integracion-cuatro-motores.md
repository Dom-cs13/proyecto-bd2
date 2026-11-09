# [I3-09] Corrige seguridad y persistencia de ALBA Suite sin rediseño

Base: `main`. Head: `fix/I3-09-auditoria-integracion`. Estado solicitado: **Open, sin auto-merge**.

## Descripción

Hospital aceptaba accesos sin autenticar y JWT inválidos; Hospital, Laboratorio y el portal principal pediátrico podían anunciar registros guardados solo en memoria. Esta propuesta exige autenticación verificada y confirmación de la API antes de actualizar el estado local, persiste ediciones de Hospital/Laboratorio y elimina resultados federados simulados. Mantiene intactos los 30 archivos HTML/CSS de las cuatro instituciones.

Hospital y Laboratorio consultan las cuatro instituciones con Enter desde su buscador existente. La ficha federada conserva la proyección autorizada: no comparte notas clínicas ajenas ni fusiona identidades. El PR incluye cambios compartidos de autenticación, clientes API, contrato y validadores, además de los adaptadores Mongo/Firestore y el valor predeterminado de validación TLS de MariaDB.

## Validación

- `npm run lint`: aprobado.
- `npm test`: 469 aprobadas; 5 omitidas explícitamente por requerir contenedores.
- Suite desechable ejecutada separadamente: 5/5 aprobadas. PostgreSQL 16, MongoDB 7 y MariaDB 11 reales; Firestore en emulador oficial. No son instancias de producción.
- Cuatro orígenes × tres instituciones consultantes, persistencia tras dos reinicios reales del proceso Node, edición y lectura posterior, rechazo de sustitución de identidad y caída física de MongoDB con los otros motores disponibles. Repetición final de esta prueba: aprobada, 18,79 s.
- Rollback de recetas/atención y RLS en SQL; suite de contrato común con dobles en memoria; regresiones DOM y huellas de HTML/CSS.
- `npm run verificar:aislamiento`, `npm run skills:check` y `git diff --check`: aprobados.

## Revisión necesaria y límites

- Requiere aprobación de I3 del [ADR 0002](./decisiones/0002-edicion-local-pacientes.md) para la nueva extensión PATCH de edición. No se modifica el puerto compartido.
- Hospital y Laboratorio requieren cuentas provisionadas por el operador; no hay cuentas demo por defecto. No se modificaron credenciales reales.
- No se verificaron Atlas/Supabase/Firebase/MariaDB de producción. El emulador no prueba IAM de Firebase.
- No se amplía el acceso a datos clínicos de otras instituciones. No se implementa un expediente clínico global sin decisión de confidencialidad.
- Siguen pendientes el flujo HTTP clínico completo de Hospital, la unificación de estudios de Laboratorio con el historial común y endpoints de algunas ediciones. Los formularios compuestos que usan varios endpoints informan errores parciales y no se anuncian como transacciones globales.
- Sin comparación visual por capturas de navegador; sí conservación exacta de HTML/CSS y pruebas de comportamiento DOM. El informe enumera el resto de límites.

Informe: [auditoría de integración](./auditoria-integracion-cuatro-motores.md). Bitácora: [I3, sesión 8](./bitacoras/I3-laboratorio-firestore/bitacora.md).

## Checklist

- [x] Título con formato de tarea.
- [x] Sin drivers ni SQL nuevos en domain/application; sin ORMs.
- [x] Salidas modificadas pasan por mappers.
- [x] Contrato común en verde contra MockAdapter y los cuatro adaptadores con dobles.
- [x] Sin secretos, pacientes reales, archivos privados ni artifacts en los commits.
- [x] Bitácora incluida.
- [x] Zod, documentación, ejemplo y ADR propuesto para edición local.
- [ ] Aprobación de I3 del cambio contractual antes de fusionar.
- [ ] CI remoto aprobado tras publicar el PR.

El script de CI tiene una excepción probada para esta rama y no debe intentar fusionarla. No hacer merge automático.
