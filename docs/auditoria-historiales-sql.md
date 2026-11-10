# I3-09 · Identidad e historiales PostgreSQL / MariaDB

Fecha: 2026-11-09. Rama: `fix/I3-09-auditoria-integracion`. Revisión iniciada sobre `24c5450`; entrega incremental autorizada en el PR #36, sin merge.

## Hallazgos y correcciones

- Los mapeadores SQL no resolvían de forma uniforme `documento` / `documento_identidad` y conservaban cadenas vacías aunque hubiera un documento alternativo. Ahora seleccionan el valor existente no vacío, conservan ceros iniciales y devuelven `null` si no existe. Nunca usan el ID del expediente ni el documento del tutor como identidad del paciente. Esto no recupera documentos que nunca se almacenaron ni agrega columnas al esquema real.
- MariaDB leía solo la primera receta (`LIMIT 1`) y la exponía como `receta`, mientras la interfaz consulta `recetas`. Ahora recupera todas, con sus medicamentos, en la colección esperada. Conserva el alias singular para consumidores existentes.
- Las fechas de tratamiento MariaDB se truncaban mediante `String(Date)`, produciendo fechas incorrectas. Se utiliza el conversor ISO existente.
- La ficha y tabla pediátricas esperaban propiedades opcionales ausentes, como `medico`, `dias`, `dosis` y campos del tutor. Ahora muestran `No registrado`, emplean los alias reales disponibles y no inventan profesional, duración, documento o estado del historial.
- Los historiales externos redactados se anunciaban como si no existieran consultas. Ahora se distinguen `Información restringida` y `Sin consultas registradas`. Recepción pediátrica conserva la restricción también en expedientes propios. La marca de presentación solo existe en memoria del frontend: no cambia el contrato HTTP ni sus permisos.

No se modificaron controladores de red, permisos, roles, conexiones, esquemas, HTML ni CSS. No se cambiaron Hospital ni Laboratorio. Se conservó el cambio previo del usuario en el fallback de `estadoClinico` de `patientTable.js`.

## Evidencia reproducible

- Suite general de entrega: **508 aprobadas, 14 omitidas** explícitamente por requerir infraestructura. Incluye integración sin motores externos y contratos compartidos. Las cuatro regresiones adicionales verifican `estadoClinico` ausente/nulo y estados existentes en la tabla pediátrica.
- Regresiones de identidad: ambos SQL, columnas alternativas, blancos, números, ceros iniciales y ausencia de documento sin sustitución por el del tutor.
- Regresión MariaDB: varias consultas y recetas, diagnósticos/tratamientos, fechas ISO y consultas SQL exclusivamente de lectura para recuperar el historial.
- Regresiones DOM: ficha sin documento, tabla incompleta, clínica local y datos opcionales, restricción externa y restricción de recepción local.
- Contrato y conservación visual: suite enfocada aprobada; huellas originales de 30 HTML/CSS y estilos inline de 27 módulos JS intactas, sin regenerar fixtures.
- Dos pruebas desechables: PostgreSQL 16 con RLS y nuevo recorrido PostgreSQL ↔ MariaDB 11. Altas HTTP `201`, lectura posterior desde el motor con otra instancia de adaptador, documento conservado, clínica local completa y consultas externas excluidas. Chrome abre las pantallas originales de ambas instituciones y verifica las recetas locales y los mensajes externos. Peticiones a cualquier otro origen, incluido localhost:3000, bloqueadas.
- Lint, aislamiento institucional y sincronización de skills aprobados. Repetición de integración para entrega: **2/2 aprobadas** (11,61 s), incluido rollback de receta con detalle inválido en ambos SQL sin perder las dos recetas anteriores. Contrato, conservación visual y fichas: **57/57** aprobadas por separado.

Para repetir las pruebas SQL se necesitan dos contenedores **creados exclusivamente para pruebas** llamados `alba-odontologia-validacion` y `alba-mariadb-auditoria`, con puertos publicados en loopback y autenticación efímera. El test crea bases de nombre único y elimina únicamente esas bases dentro de dichos contenedores:

```powershell
$env:ALBA_SQL_DESECHABLE='1'
$env:ALBA_ODONTOLOGIA_DESECHABLE='1'
npx vitest run tests/integration/historialesSqlDesechables.test.js tests/integration/odontologiaPostgresDesechable.test.js --pool=threads --maxWorkers=2
```

No ejecutar este recorrido con bases reales o contenedores reutilizados que contengan información clínica. No se cargan archivos de entorno.

## Pendientes y límites

La comprobación manual PostgreSQL ↔ MariaDB del entorno del usuario se toma como antecedente; esta sesión valida motores desechables y no accede a pacientes reales. Quedan pendientes verificar las fichas e historiales reales mediante cuentas autorizadas y determinar si los documentos faltantes existen realmente en las filas de origen. Si no están almacenados, su corrección requiere un procedimiento del equipo; la aplicación mostrará `No registrado`.

Las consultas y tratamientos de otras instituciones continúan restringidos por el backend. Compartirlos requiere autorización del equipo; un arreglo visual no habilita ese acceso. No se puede deducir que no existan consultas a partir de una respuesta redactada.

MongoDB y Firestore permanecen como pendientes de configuración reportados en el entorno del usuario; no se investigaron ni modificaron en esta sesión. No se afirma que los cuatro motores reales funcionen. Los permisos de escritura, esquemas efectivos y persistencia reales de MariaDB siguen sujetos a verificación autorizada. No se leyeron secretos ni se modificaron bases reales.
