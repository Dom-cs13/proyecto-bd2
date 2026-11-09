# Integración HTTP de Odontología · I2-03

Implementación local en `feat/I2-03-integracion-api`. No ejecuta migraciones.
El registro/búsqueda por documento requiere aplicar previamente la migración
`infra/database/postgresql/ddl/odontologia_documento_i2.sql`, pendiente de revisión.
Reutiliza `PostgresAdapter`, su mapper y `crearPoolPostgres`. La conexión se crea de
forma diferida y las pruebas inyectan repositorios o un pool simulado.

| Ruta | Secretaría | Odontólogo |
|---|---|---|
| `POST /pacientes` | Registrar | 403 |
| `GET /pacientes?texto=Ana&pagina=1&limite=10` | Listar/buscar | Listar/buscar |
| `GET /pacientes/:id` | Ficha | Ficha |
| `GET /pacientes/:id/historial` | 403 | Historial |
| `PATCH /pacientes/:id/archivar` | 403 | Archivar |
| `POST /consultas` | 403 | Crear consulta y servicios/piezas |
| `POST /consultas/:id/diagnosticos` | 403 | Diagnosticar |
| `POST /diagnosticos/:id/tratamientos` | 403 | Registrar tratamiento |
| `POST /consultas/:id/recetas` | 403 | Prescribir medicamentos |
| `GET /odontologia/catalogos` | 403 | Medicamentos y servicios activos |
| `GET /odontologia/status` | Estado local | Estado local |

Esta matriz aplica mínimo privilegio mientras se integra la clasificación
compartida de I4-01. No se entrega el expediente clínico a secretaría.

El JWT debe usar HS256, `iss: red-salud`, `aud: red-salud-web`, `sub` entero positivo
representado como string y dentro del rango integer de PostgreSQL,
`exp` vigente, `institucion: odontologia` y un rol de la tabla. Se verifica en el
servidor con la misma configuración del login odontológico existente. Los datos
del cuerpo y de la URL no pueden elegir otra institución.

Registro institucional actualmente persistible:

```json
{
  "documentoIdentidad": "FICTICIO-I2-001",
  "nombre": "Ana",
  "apellidos": "López",
  "fechaNacimiento": "2000-01-01",
  "genero": "Femenino",
  "telefono": "55550000",
  "correo": "ana@example.invalid",
  "direccion": "Dirección ficticia"
}
```

Obligatorios en la entrada canónica: `documentoIdentidad`, `nombre`, `apellidos`,
`fechaNacimiento`, `genero`. Por compatibilidad se conserva la entrada anterior
con `nombres` y `sexo` opcional, sin documento obligatorio. El portal usa la entrada
canónica. El mapper agrega `nombre`, `genero` y `documentoIdentidad` conservando los
alias anteriores; no se modificó Zod compartido. Las filas antiguas sin documento
retornan `documentoIdentidad: null` y requieren completar el dato real. No se
certifica equivalencia contractual de esas filas.

Se rechazan propiedades no soportadas, fechas imposibles/futuras y documentos
vacíos. Registro responde 201; lecturas y archivo, 200. Búsqueda: `texto`,
`documento` exacto, `estado`, `pagina` (1–1000000), `limite` (1–100).

Archivado:

```json
{ "motivo": { "tipo": "traslado", "detalle": "Traslado solicitado" } }
```

Tipos: `traslado`, `fallecimiento`, `administrativo`, `otro`. El expediente ausente
responde 404 y el ya archivado 409. El adaptador consolida la respuesta con las
consultas antes de confirmar el archivo, en su misma conexión y transacción.
Si esa consolidación falla, hace rollback; el caso de uso no hace una lectura
adicional después del commit. Una carrera concurrente que impida el
UPDATE se traduce en 409. Los fallos de conexión conocidos responden 503, las
violaciones de unicidad 409, y los errores de validación 400, siempre con
`{ "error": { "codigo": "...", "mensaje": "..." } }`.

## Dependencias que impiden cerrar I2-03

- La migración de documento e índice único fue ejecutada solo en Docker desechable.
  Su despliegue y la normalización de filas antiguas requieren revisión por PR.
  El registro/búsqueda por documento responde 503 si falta la columna.
- Hay diferencias preexistentes del contrato compartido (estado del historial
  anidado frente a la definición del puerto, campos adicionales de paciente y
  entradas clínicas poco especificadas). No se modificaron el puerto ni los
  esquemas de otros motores para resolverlas unilateralmente.
- La lectura en red ya usa una composición diferida de obtenerTodos y fábricas
  institucionales, con clasificación conservadora basada en I4-01 (ver abajo).
  El registro de Laboratorio y la identidad canónica de Pediatría siguen pendientes
  en esta base local. No se inventan instancias disponibles.
- La suite de contrato compartida todavía no está implementada en esta rama
  (`tests/contract/` solo contiene `.gitkeep`). Las pruebas HTTP no la sustituyen.

## Compatibilidad con PR #23 · revisión histórica

En la revisión original se consultó el [PR #23](https://github.com/Dom-cs13/proyecto-bd2/pull/23), entonces abierto,
head `edd0e5f649a38949752b38e33978631c49784bd5`.
Agrega `infrastructure/config/RepositoryFactory.js`, middleware JWT global y
rutas genéricas `/pacientes` para Laboratorio. Esta rama usa archivos propios de
Odontología para evitar sobreescribirlos. Al integrar el PR se debe despachar las
rutas genéricas según la institución verificada, antes de ejecutar controladores.
El router dental ahora registra autenticación solo en rutas/métodos concretos y
cede las rutas genéricas destinadas a Hospital/Laboratorio/Pediatría al siguiente
router. Para elegir destino decodifica la institución sin otorgar permisos ni
establecer req.user; todo acceso dental verifica la firma. El siguiente router
debe autenticar sus propias peticiones. Si no está montado, responde el 404 general.
Las rutas `/odontologia/...` siempre exigen JWT dental y no se ceden.

Se probó montaje dental antes de un router posterior simulado. No se puede
garantizar coexistencia si un router genérico anterior consume ya la petición.
Además, el middleware del PR #23 permite decodificar como identidad cuando falla
la firma: Odontología no lo adopta ni confía en req.user precargado. Hace falta
coordinar esa autenticación y el orden/selector global antes de integrar el PR.

El PR también propone motivo de archivo textual y estado en la raíz, diferentes
del motivo estructurado del puerto actual y de `historial.estado` en AGENTS.md.
Esta implementación conserva el puerto y el estado anidado actual. No modifica el
contrato ni adopta las propuestas pendientes del PR.

## Operaciones clínicas y frontend

`POST /consultas` recibe `pacienteId`, `motivo` (máximo 250), `observaciones`
opcional, `citaId` opcional y `detallesInstitucion` opcional. `usuarioId` se toma
del JWT; enviarlo en el cuerpo produce 400. `detallesInstitucion` admite `polizaId`
y `servicios: [{ servicioId, piezaDental?, superficie?, precioAplicado?, observaciones? }]`.
Consulta y servicios se guardan en la misma transacción. FDI: 11–18, 21–28, 31–38,
41–48. Superficies: O/M/D/V/L/P/I; requieren pieza. Precio no negativo, dos decimales.

Diagnóstico: `{ descripcion, observaciones? }`. Tratamiento: lo anterior más
`fechaInicio?`, `fechaFin?`, donde fin requiere inicio y no puede ser anterior.
Receta: `{ indicacionesGenerales?, medicamentos: [{ medicamentoId, dosis,
frecuencia, duracion?, cantidad?, indicaciones? }] }`, entre 1 y 50 medicamentos.
Las FK inválidas responden 400 y los estados no editables 409.

El historial ahora consolida diagnósticos con tratamientos, recetas con sus
medicamentos y `consulta.detallesInstitucion.servicios`. Lecturas parametrizadas
por los IDs de las consultas, sin una consulta adicional por cada elemento.
La lectura completa usa una conexión con `REPEATABLE READ READ ONLY`. Las
escrituras clínicas bloquean la fila del historial, compatible con los permisos
de actualización limitados a historial del rol propuesto; no necesitan UPDATE
sobre consulta ni diagnóstico para bloquearlos. Cualquier futuro cierre de
consulta deberá respetar ese mismo bloqueo del historial.

En `/odontologia/`, una sesión válida usa la API. El portal ofrece búsqueda por
nombre/documento/estado, paginación, registro, ficha, expediente, consultas con
varios servicios/piezas, diagnósticos, tratamientos, recetas con varios
medicamentos, archivo y panel técnico local. Los componentes de pacientes viven
en `frontend/shared/js/components/pacientes.js`; las peticiones pasan por
`frontend/shared/js/api/odontologia.js` y el cliente existente. Hay estados de
carga/error/vacío y reintento, control de doble envío y escape de texto recibido.

La maqueta previa se conserva solo con `?preview=secretaria` o
`?preview=odontologo` en localhost sin sesión. No realiza escrituras.

## Verificación

`npm run lint` y `npm test`. La suite de integración usa Supertest, JWT ficticios,
repositorios simulados y una prueba con el PostgresAdapter real sobre pool
simulado. La fábrica de conexiones PostgreSQL se bloquea explícitamente en esa
suite. También hay pruebas de formularios con jsdom y API simulada. No utiliza
archivos de entorno ni conecta a Supabase. Resultados por fase y límites en
`docs/odontologia-avance-I2-01-a-I2-13.md`; revisión posterior en
`docs/odontologia-estabilizacion.md`.

## Extensiones institucionales de esta entrega

Todas requieren Bearer JWT dental válido (HS256, issuer, audience, exp y sub).
La institución se toma del JWT; no se admite elegir otra base desde el cuerpo.
Errores conservan `{ error: { codigo, mensaje } }`. No se cambia el contrato común.

| Método y ruta | Entrada | Roles |
|---|---|---|
| GET /odontologia/agenda | query `fecha` YYYY-MM-DD; máximo 500 citas por día | Secretaría; odontólogo ve únicamente sus citas |
| GET /odontologia/equipo | Sin cuerpo; profesionales activos | Secretaría |
| POST /odontologia/citas | pacienteId, usuarioId, fecha, hora HH:mm, motivo | Secretaría |
| PATCH /odontologia/citas/:id | fecha, hora, estado programada/confirmada/cancelada/no_asistio | Secretaría |
| PATCH /odontologia/pacientes/:id/contacto | Uno o más: telefono, correo, direccion | Secretaría |
| GET /odontologia/pacientes/:id/responsables | Sin cuerpo | Secretaría y odontólogo |
| POST /odontologia/pacientes/:id/responsables | nombres, apellidos, parentesco, esPrincipal boolean; dpi y telefono opcionales | Secretaría |
| GET /odontologia/pacientes/:id/alergias | Devuelve items y catalogo activo | Odontólogo |
| POST /odontologia/pacientes/:id/alergias | alergiaId, nivelSeveridad, reaccion; observaciones opcionales | Odontólogo |
| PATCH /odontologia/consultas/:id/finalizar | Sin datos adicionales | Odontólogo autor |

Listados devuelven `{ items: [...] }`; agenda contiene id, pacienteId, usuarioId,
nombre, fecha, hora, motivo y estado. Escrituras de citas, contacto y relaciones
devuelven un objeto con id string; contacto devuelve el paciente y finalización
devuelve la consulta. POST responde 201, las restantes operaciones 200.

Registro de menor mediante POST /pacientes exige
`detallesInstitucion.responsableLegal` con la misma estructura del POST de
responsables y `esPrincipal: true`. Alta y vínculo se guardan en una transacción;
el incumplimiento responde 400 RESPONSABLE_REQUERIDO. Las escrituras sobre un
historial archivado se rechazan. La receta sigue siendo clínica; no se autoriza
a secretaría a consultar notas ni prescribir.

Solo se reprograman citas programadas/confirmadas sin consulta asociada. El cierre
finaliza consulta y completa cita atómicamente. Una consulta con cita requiere
que paciente y profesional coincidan con los de la cita activa. Los conflictos
de horario, vínculos duplicados o estado responden 409. Los objetos de entrada
son estrictos y no aceptan propiedades extra.

Pruebas y límites de aceptación, incluida integración pendiente de Laboratorio:
[matriz funcional](odontologia-aceptacion-funcional.md).

## I2-02/I2-03/I2-10 · lectura en red implementada

Actualización: el PR #23 ya está fusionado remotamente, head
`07e5ee8421e4d4c7a638b69c30abb384be7dadb9`. No se incorporó a esta rama ni se
modificaron los adaptadores ajenos. La matriz funcional registra las diferencias
con su contrato v1.0, emisores de JWT y registro compartido.

`GET /red/pacientes?documento=...&texto=...&pagina=1&limite=10`

- Requiere documento o al menos dos caracteres de nombre, con paginación acotada.
- Devuelve `{ resultados: [{ institucion, estado, items, total }] }` con las cuatro
  instituciones en orden estable. estado es `ok` o `no_disponible`.
- Ejecuta únicamente listarPacientes, con Promise.allSettled y límite de espera.
  200 con resultados parciales; 503 cuando ninguna fuente se puede consultar.
  Un registro ausente, error, contrato de identidad inválido o timeout se informa
  como no_disponible; esto no constituye una medición de salud del motor.
- Se proyectan id, documentoIdentidad, nombre, apellidos, fechaNacimiento y genero
  cuando están presentes. Se valida id/nombre/apellidos con la selección del Zod
  común. No se reparan alias heredados de otros mappers ni se expone contacto.

`GET /red/:institucion/pacientes/:id/historial`

- institución es hospital/odontologia/laboratorio/pediatria; id es un identificador
  opaco acotado, no se limita globalmente a enteros SQL.
- Ejecuta exclusivamente obtenerHistorial en el repositorio seleccionado.
- 200 con historial autorizado, 404 si no existe, 503 si no se puede consultar.
- Terceros reciben paciente demográfico, historial administrativo y consultas
  vacío. Se omiten motivos de archivo, contacto, tutores, alergias, auditorías,
  notas, recetas y detalles institucionales. En la institución propia, odontólogo
  y pediatra/enfermería conservan lectura clínica mediante lista positiva.
- Se usa la forma anidada historial.estado indicada por AGENTS/plan. La proyección
  de permisos acepta la forma preexistente raíz del adaptador de Hospital sin
  modificarlo; sigue pendiente armonizar el contrato compartido.

| Institución del JWT | Roles aceptados en red |
|---|---|
| Hospital | admin |
| Odontología | odontologo, secretaria |
| Laboratorio | laboratorista, tecnico, validador, admin |
| Pediatría | pediatra, enfermeria, recepcion |

Firma HS256 y exp obligatorios, sin fallback a decode ni clave de demostración.
Se verifica issuer/audience salvo el token administrativo actual de Hospital que
no los emite; si los incluye, deben ser los institucionales. La clave se obtiene
de configuración en ejecución, sin leer archivos de entorno.

POST/PUT/PATCH/DELETE bajo /red responden 403 ESCRITURA_EN_RED_PROHIBIDA antes
de resolver repositorios. Las escrituras locales conservan su institución del
JWT y no usan el mapa de red. Usuarios ajenos reciben 403 en rutas dentales.

Pruebas: MockAdapter, Supertest de cuatro perfiles con fuentes simuladas,
DOM de ambos roles y lectura HTTP de Odontología contra PostgreSQL desechable.
No se consultaron las cuatro bases reales ni Supabase.

## I2-11 · odontograma y presentación

El formulario de consulta incluye 32 piezas FDI: 11–18, 21–28, 31–38 y 41–48.
El odontólogo selecciona pieza/superficie O/I/M/D/V/L/P y un servicio del catálogo.
La selección se escribe en la fila activa; se pueden agregar otras piezas y
servicios. El envío usa el POST /consultas existente y
`detallesInstitucion.servicios`, sin nuevo endpoint o cambio de esquema.

El expediente muestra piezas con procedimientos persistidos, en solo lectura.
No se infiere un diagnóstico a partir del color de la pieza. Secretaría no tiene
editor ni permiso para guardar clínica. DOM y persistencia Docker están probados.

CSS conserva Alba y agrega formularios agrupados, tablas, foco visible, navegación
contextual y menú móvil completo. Se verificaron seis vistas en Chrome con
fixtures explícitos, viewport real 1440/390 px y sin desbordamiento de página;
el mapa dental conserva desplazamiento interno. Script reproducible:
`node scripts/verificar-odontologia-visual.js` (requiere Chrome).
