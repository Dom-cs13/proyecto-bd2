# [I3-09] Corrige registro, seguridad e integración de ALBA Suite sin rediseño

Base: `main`. Head: `fix/I3-09-auditoria-integracion`. PR **Open, no Draft**, para revisión manual. No hacer merge ni activar auto-merge.

## Descripción

Hospital aceptaba accesos sin autenticar y JWT inválidos; los portales podían anunciar registros guardados solo en memoria. Además, el cliente forzaba solicitudes al puerto 3000, Pediatría omitía el tutor capturado como nombre completo y un fallo de lectura posterior hacía parecer que el alta había fallado.

Ambas auditorías quedan incluidas: autenticación verificada, confirmación de escritura antes del éxito, persistencia del tutor y ediciones locales, protección contra doble envío, errores útiles, diagnóstico pediátrico corregido, preservación de la URI Mongo y verificación TLS por defecto. Odontología conserva la validación de responsable para menores y muestra un mensaje claro si está incompleto.

La búsqueda en red conserva el origen y las proyecciones autorizadas. No fusiona identidades, replica expedientes ni comparte notas clínicas ajenas. No hay cambios en los 30 archivos HTML/CSS ni en los estilos inline de 27 módulos JS. Se reutilizan los controles existentes.

## Pruebas repetidas antes de publicar

- `npm run lint`: aprobado.
- `npm test`: 483 aprobadas; 13 omitidas expresamente por requerir infraestructura.
- Contratos, conservación de diseño y prohibición de auto-merge de esta rama: 49/49 aprobadas por separado.
- `npm run verificar:aislamiento`, `npm run skills:check` y `git diff --check`: aprobados.
- Las 13 pruebas desechables pasaron también por separado, en cuatro archivos (65,41 s), incluidos ocho recorridos con Chrome real. Tres motores reales locales: PostgreSQL 16, MariaDB 11 y MongoDB 7; Firestore en el emulador oficial. No equivalen a bases de producción.
- Los cuatro formularios devolvieron 201 y se confirmó persistencia con drivers; se verificaron tutor, historial automático, adulto y menor odontológicos, doble envío y fallo de recarga posterior.
- Cuatro lecturas clínicas locales y 16 búsquedas/aperturas desde los cuatro portales, incluidas 12 entre instituciones distintas, sin filtrar notas ajenas. Persistencia tras reinicios de Node, rollback/RLS SQL y caída aislada de MongoDB desechable.

## Pendientes para el compañero que revisa

- **MongoDB y Firestore siguen desconectados en el entorno del usuario.** Falta comprobar configuración efectiva, identidad de servicio, DNS/TLS, acceso de red e IAM, sin mostrar secretos. No se afirma que los cuatro motores de producción funcionen.
- **MariaDB real:** verificar esquema efectivo y GRANT de escritura, y repetir el formulario con una cuenta y datos autorizados. Un ping positivo no garantiza INSERT permitido. No se escribió un paciente de prueba en esa base.
- La advertencia concreta del despliegue odontológico debe contrastarse con su código HTTP y `error.codigo`. Se comprobó el rechazo válido de menores sin responsable y altas correctas con responsable o de adultos.
- Aprobación de I3 del ADR propuesto 0002 para la extensión PATCH de edición local. El puerto compartido no cambia y la aprobación no se da por recibida.
- Permanecen las limitaciones documentadas del flujo clínico HTTP de Hospital, la integración de estudios de Laboratorio en el historial común y algunas ediciones. Los formularios compuestos que usan varios endpoints no se presentan como una transacción global.
- Hospital y Laboratorio requieren cuentas provisionadas por el operador; no hay cuentas demo implícitas. No se modificaron credenciales ni bases reales.

## Informes y reproducción

- [Auditoría inicial](https://github.com/Dom-cs13/proyecto-bd2/blob/fix/I3-09-auditoria-integracion/docs/auditoria-integracion-cuatro-motores.md)
- [Segunda auditoría y comandos de pruebas desechables](https://github.com/Dom-cs13/proyecto-bd2/blob/fix/I3-09-auditoria-integracion/docs/auditoria-funcional-segunda-revision.md)
- [Bitácora I3](https://github.com/Dom-cs13/proyecto-bd2/blob/fix/I3-09-auditoria-integracion/docs/bitacoras/I3-laboratorio-firestore/bitacora.md)
- [ADR 0002 pendiente de aprobación](https://github.com/Dom-cs13/proyecto-bd2/blob/fix/I3-09-auditoria-integracion/docs/decisiones/0002-edicion-local-pacientes.md)

## Checklist

- [x] Título con formato de tarea; sin drivers ni SQL nuevos en domain/application ni ORMs.
- [x] Salidas modificadas pasan por mappers; contrato común en verde.
- [x] Bitácora, informes y regresiones incluidos.
- [x] HTML/CSS y estilos conservados.
- [x] Sin archivos de entorno, certificados, secretos reales, datos clínicos reales, archivos personales ni artifacts en los commits.
- [x] Zod, documentación, ejemplo y ADR propuesto para edición local.
- [ ] Aprobación de I3 del cambio contractual antes de fusionar.
- [ ] Validaciones manuales autorizadas en bases de producción.

Esta rama está exceptuada del auto-merge del script de CI mediante una prueba automatizada. El PR debe permanecer abierto para revisión manual.
