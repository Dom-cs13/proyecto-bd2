# Segunda auditoría funcional de ALBA Suite

Fecha: 2026-11-09. Rama: `fix/I3-09-auditoria-integracion`. Cambios locales **sin nuevos commits, push ni PR**.

## Resultado y evidencia que faltaba

La suite anterior no ejecutaba los formularios principales en un navegador real. Esta revisión añade Playwright con Chrome local, sirve los archivos HTML/JS originales con Express y envía solicitudes HTTP reales a los cuatro adaptadores. No utiliza respuestas HTTP simuladas para comprobar las altas y las consultas en red.

Los cuatro formularios devolvieron **201**. Su persistencia se comprobó con los drivers de PostgreSQL, MariaDB, MongoDB y Firestore. Los tres primeros son motores reales en contenedores desechables; Firestore es el emulador oficial con Admin SDK. **Esto no valida las escrituras en producción.**

Las sesiones del navegador son JWT de prueba firmados y verificados por el middleware real, con el rol correspondiente. No se utilizaron cuentas, tokens, certificados ni pacientes reales. El navegador bloquea cualquier solicitud fuera del origen del backend desechable, incluido un posible backend real en el puerto 3000.

## Errores reproducidos y correcciones

| Hallazgo | Evidencia | Corrección |
|---|---|---|
| La API se forzaba al puerto 3000 al abrir Express en otro puerto | Chrome no recibía respuesta del backend desechable; las solicitudes intentaban salir a 3000 y fueron bloqueadas | Mismo origen de Express por defecto. `ALBA_API_BASE` permite una base explícita para un servidor de vistas separado |
| Pediatría omitía el tutor pese a devolver 201 | El formulario captura nombre completo; Zod lo normaliza como `nombres` y deja `apellidos` vacío. El adaptador exigía apellidos para insertar el tutor. La consulta SQL confirmó paciente e historial, pero ninguna relación con tutor | Persistir el nombre completo sin inventar una división de apellidos. Alta, tutor y relación quedan dentro de la transacción existente |
| Una lectura posterior fallida se presentaba como fallo de registro | Regresión de store y navegador: POST real 201 seguido de GET abortado intencionalmente | Conservar el alta confirmada, limpiar el formulario y advertir que falló la recarga, sin invitar a reenviar el registro |
| Doble envío pediátrico sin bloqueo | Prueba de dos envíos consecutivos del formulario real | Bloqueo durante la solicitud; se comprobó un único POST y un único paciente persistido |
| El panel pediátrico leía una forma de JSON incorrecta | Usaba `respuesta.pediatria`; el contrato real devuelve `respuesta.motores.pediatria` | Lectura de la ruta correcta; Chrome comprobó el estado conectado cuando el diagnóstico lo confirma |
| Se perdían mensajes útiles de error | El componente aceptaba `mensaje`, pero los clientes API lanzan `Error.message` | Mostrar el mensaje real utilizando el componente existente y escapar su contenido para impedir interpretación como HTML |
| MariaDB podía intentar registrar sin documento ante una columna desconocida | La regresión reprodujo el fallback que descartaba identidad y grupo sanguíneo | Eliminar el fallback de escritura incompleta; rollback y 503 explicando incompatibilidad de esquema, en lugar de aparentar compatibilidad |
| Un ping positivo no garantiza permisos de INSERT | Cuenta SQL de prueba con SELECT: ping exitoso y registro rechazado, sin paciente nuevo | La API devuelve 503 de configuración de permisos; no lo confunde con un rol HTTP inválido ni deja un error interno genérico |
| La conexión Mongo reconstruía la URI de Atlas | Regresión: se perdían base de datos, `authSource`, `replicaSet` y otras opciones, sustituyéndolas por valores fijos | Entregar la URI intacta al driver oficial, respetar la base configurada y no devolver detalles privados de errores de conexión |
| La fábrica odontológica desactivaba la verificación de certificados por defecto | Prueba con `PGSSL_REJECT_UNAUTHORIZED` ausente | Verificar por defecto; mantener la configuración explícita existente. Un despliegue que requiera CA debe configurarla correctamente |

No cambió el puerto compartido ni los esquemas Zod. El ajuste del tutor satisface los campos que el validador ya admite; no se impone un apellido separado que el formulario no captura.

## Advertencia de Odontología

Se reprodujo el rechazo **400 / RESPONSABLE_REQUERIDO** al intentar registrar un menor sin responsable. Esta es una regla vigente, no un fallo de PostgreSQL. Al completar los datos, el mismo formulario devolvió 201 y la consulta SQL confirmó paciente e historial. También se registró un adulto sin responsable opcional y sin advertencias.

Si se completaba únicamente una parte del responsable, la validación podía terminar en un mensaje genérico. Ahora el controlador del formulario pide expresamente nombres, apellidos y parentesco antes de enviarlo. No se elimina el requisito de responsable ni se amplían permisos.

La advertencia concreta observada en el despliegue real no se conoce: debe compararse su código HTTP y `error.codigo` con esta evidencia. No se atribuye automáticamente a la validación de menores sin disponer de ese dato.

## Historiales y búsqueda en red

Después de registrar mediante los cuatro formularios, se agregaron consultas ficticias únicamente a las bases desechables mediante los adaptadores. Se verificaron:

- Cuatro lecturas locales autorizadas: cada motor devolvió una consulta persistida con el contenido esperado.
- Dieciséis búsquedas y aperturas desde los cuatro portales, incluidas las doce combinaciones entre instituciones diferentes.
- HTTP 200, institución de origen e historial activo en cada ficha consultada.
- Ausencia de notas clínicas ajenas y de `detallesInstitucion` en las respuestas externas. No se interpreta una lista clínica reducida como pérdida de datos: se contrastó con la lectura local autorizada.
- Funcionamiento de los controles existentes de búsqueda, apertura y cierre; conservación de roles y restricciones del backend.
- Persistencia tras reiniciar el proceso Node, rechazo de sustitución de identidad y aislamiento al apagar el MongoDB desechable, mediante la suite HTTP de la primera auditoría ejecutada nuevamente.

No se agregó un historial clínico global ni se amplió el intercambio de datos restringidos.

## Diagnóstico del servidor local existente: solo lectura

Se consultó `GET http://127.0.0.1:3000/system/status` sin enviar credenciales ni datos clínicos. Respondió 200:

| Institución | Estado observado |
|---|---|
| Hospital / MongoDB | desconectado |
| Odontología / PostgreSQL | conectado |
| Laboratorio / Firestore | desconectado |
| Pediatría / MariaDB | conectado |

La lectura final mantuvo esos estados. El proceso de auditoría no heredaba las variables privadas del servidor; **eso no demuestra que falten en el proceso que está atendiendo el puerto 3000**. No se leyeron archivos de entorno ni llaves para averiguarlo, y no se reinició ese backend.

La corrección de la URI Mongo es un fallo comprobado del código, pero no se afirma que sea la causa única de la desconexión actual de Atlas. Deben comprobarse con el operador la URI efectiva, la base seleccionada, DNS SRV/TXT, TLS, lista de acceso e identidad de servicio, tras cargar la versión corregida del backend.

No se reprodujo un defecto de código de inicialización de Firebase con configuración válida simulada. Las regresiones confirman que una API key del navegador no sustituye las credenciales del Admin SDK y que se normalizan los saltos escapados de configuración. La causa concreta de la desconexión del proceso real de Firestore continúa pendiente: configuración administrativa, proyecto, formato de credencial, IAM o conectividad deben revisarse en el entorno autorizado sin mostrar secretos.

Para la falla de registro en la MariaDB real quedan pendientes esquema efectivo y GRANT de su cuenta. Se demostró que el DDL oficial funciona con el formulario corregido y que SELECT no implica INSERT. **No se escribió un paciente de prueba en esa base real ni se cambiaron sus permisos o esquema.** Lo mismo aplica a la advertencia real de Supabase y a la verificación de su CA/TLS.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm run lint` | aprobado |
| `npm test` | 483 aprobadas; 13 omitidas explícitamente por requerir infraestructura |
| Contrato común y conservación del diseño | 47 aprobadas: contrato con dobles y dos pruebas de conservación de fuentes visuales |
| Cuatro archivos de integración desechable | 13/13 aprobadas; incluye ocho recorridos con Chrome |
| Repetición final de Chrome con comprobaciones ampliadas | 8/8 aprobadas, 33,54 s |
| `npm run verificar:aislamiento` | aprobado; pruebas aisladas con dobles |
| `npm run skills:check` | aprobado |
| `git diff --check` | aprobado |

La suite general omite deliberadamente las pruebas desechables; no se cuentan como aprobadas por estar omitidas. Se ejecutaron separadamente. La validación de formularios está en `tests/integration/formulariosReales.test.js`. Las nuevas regresiones unitarias cubren origen HTTP, tutor y esquema MariaDB, URI Mongo, configuración Firebase, TLS odontológico, errores visibles y conservación del alta confirmada.

Las solicitudes y capturas de Chrome están localmente en `artifacts/segunda-auditoria-*/`. El JSON contiene método, ruta, estado HTTP y pasos de la prueba, sin cabeceras Authorization ni cuerpos con credenciales. Son artefactos locales; no se publicaron.

Para repetir con los contenedores dedicados disponibles:

```powershell
$env:ALBA_FORMULARIOS_REALES='1'
$env:ALBA_MOTORES_DESECHABLES='1'
$env:ALBA_ODONTOLOGIA_DESECHABLE='1'
npx vitest run tests/integration/formulariosReales.test.js tests/integration/motoresDesechables.test.js tests/integration/redCuatroMotoresDesechables.test.js tests/integration/odontologiaPostgresDesechable.test.js --pool=threads --maxWorkers=1
```

Se requiere Chrome instalado y las imágenes PostgreSQL 16, MariaDB 11, MongoDB 7 y el emulador oficial de Firestore. Los nombres y puertos de los contenedores se validan como locales antes de conectar. Las bases de cada prueba tienen nombres propios y solo se limpian datos desechables. El único contenedor preexistente se conservó.

## Conservación del diseño y estado del trabajo

No hay cambios en archivos HTML ni CSS. Pasan las huellas de los 30 archivos originales y la nueva comprobación de estilos inline de 27 módulos JavaScript. Las correcciones actúan sobre envío, datos, errores y diagnóstico; no cambian estructura visual, colores, fuentes, logotipos ni distribución. Las capturas documentan funcionalidad; no se presentan como una comparación de píxeles.

Se agregó Playwright como dependencia de desarrollo para hacer reproducible la prueba de navegador; no se descargó un navegador nuevo. La ejecución utilizó Chrome ya instalado. El entorno actual usa Node 25, para el que npm advierte que Vitest no declara soporte; para reproducir en CI conviene el Node 24 ya previsto por su workflow. Las pruebas descritas sí se ejecutaron y pasaron en esta sesión.

Al cierre de la segunda revisión, los cambios permanecían sin commit sobre `1df3b08`, sin push ni PR, conforme a la instrucción de esa sesión. Posteriormente, el usuario autorizó publicar ambas auditorías en la misma rama y repositorio. Las correcciones de esta revisión están en `210e7b1`. Antes de publicar se repitieron lint, las 483 pruebas generales, 49 verificaciones de contrato/diseño/revisión manual, aislamiento, skills y las 13 pruebas desechables (13/13, 65,41 s). No se modificó main ni se aplicaron migraciones o cambios de permisos en bases reales. Los pendientes de contrato y funcionalidades de la primera auditoría siguen vigentes.
