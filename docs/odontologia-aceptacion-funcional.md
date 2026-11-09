# Odontología · aceptación funcional

Sesiones 2026-11-08; actualización I2-02/03/10/11/13. Rama `feat/I2-finalizar-odontologia`, creada desde `main`
en `f9cf2b8`. Sin commits, push ni merge. Stash y archivos personales conservados.

## Resultado y alcance

Se implementaron flujos reales adicionales sobre el portal autenticado: dashboard
para secretaría y odontólogo, agenda por día, asignación a profesional activo,
programación/reprogramación/confirmación/cancelación/no asistencia, responsables,
alergias, contacto y cierre de consultas. Se conservaron tema CSS, tipografía,
shell y los SVG del dashboard previo. Los formularios clínicos existentes siguen
integrados. La demostración local explícita sigue separada del modo autenticado.
No se usaron datos de demostración como respuestas alternativas ante fallos de API.
La actualización añade consulta en red, odontograma FDI de 32 piezas y mejoras
de formularios, navegación, accesos contextuales y adaptación móvil.

No se modificaron el puerto, Zod compartido, contratos/API.md ni archivos de
Hospital, Laboratorio o Pediatría. `src/app.js` solo agrega import y montaje del
router de red autorizado. La composición de fábricas vive en un archivo nuevo
sin modificar RepositoryFactory común ni fábricas ajenas. El único
archivo bajo frontend/shared modificado es el cliente exclusivo de Odontología;
conserva las firmas anteriores y reutiliza apiClient. Las operaciones nuevas del
adaptador son extensiones locales, sin agregarlas al puerto de los cuatro motores.

## Matriz

“Real” significa PostgreSQL 16 desechable con RLS y rol mínimo, no producción.
“Automatizada” incluye DOM/API simulada, HTTP y/o motor según cada fila. Todas las
filas con implementación completa tienen pruebas aprobadas; las limitaciones se
detallan explícitamente. Se revisaron seis renders en Chrome real con fixtures;
la aceptación con usuarios y datos/servicios desplegados sigue pendiente.

| Función | Interfaz | Backend | Persistencia | Permisos | Automatizadas | Prueba real |
|---|---|---|---|---|---|---|
| Dashboard secretaria/odontólogo | Sí: zonas, agenda, accesos contextuales y SVG anteriores | API de agenda | Lectura SQL | JWT y rol; agenda clínica filtrada por sub | DOM ambos roles y HTTP | Agenda HTTP/SQL y Chrome con fixtures completados; usuarios pendientes |
| Buscar/listar/detalle de pacientes | Sí, filtros y paginación existentes | Sí | Sí | Ambos roles, institución local | DOM, HTTP, regresiones | Registro HTTP y lectura SQL completados |
| Registrar paciente adulto | Sí | Sí | Paciente e historial atómicos | Secretaría | DOM, HTTP | Completada mediante HTTP y rol SQL mínimo |
| Registrar menor con responsable | Sí, formulario conjunto | Exige responsable principal | Paciente, historial, responsable y vínculo en una transacción | Secretaría | DOM, HTTP y rollback SQL | Completada; conflicto del responsable revierte el alta |
| Actualizar contacto | Sí, desde ficha | PATCH institucional | Teléfono/correo/dirección | Secretaría, historial activo | DOM, HTTP | Completada |
| Responsables legales | Lista y registro de principal | GET/POST institucionales | Tablas existentes; reemplazo atómico de principal | Secretaría escribe; odontólogo lee | DOM, HTTP | Completada |
| Alergias | Catálogo, severidad, reacción y observaciones | GET/POST; actualiza vínculo existente | Upsert en paciente_alergia; catálogo activo | Solo odontólogo; historial activo | DOM, HTTP | Completada, incluida actualización |
| Citas y agenda | Fecha, profesional, paciente y estado | GET/POST/PATCH institucionales | Cita y restricción de horario existentes | Secretaría gestiona; odontólogo ve su agenda | DOM, HTTP | Completada; duplicidad real 23505 |
| Consultas programadas o sin cita | Formulario y enlace Atender cita | Sí; valida paciente, profesional y estado de cita | FK compuesta y transacción | Odontólogo; sujeto del JWT | DOM, HTTP, SQL | Completada |
| Diagnósticos | Formulario desde consulta borrador | Sí, existente | Sí | Odontólogo; historial activo y borrador | DOM, HTTP, SQL | Completada; rechazo tras finalizar |
| Procedimientos dentales y odontograma | Mapa de 32 piezas, 7 superficies, filas múltiples e historial de solo lectura | Endpoint de consulta existente | Atómicos con consulta; 11/O y 26/M verificados | Odontólogo | DOM, HTTP y SQL | PostgreSQL desechable y Chrome desktop/móvil completados; Supabase pendiente |
| Tratamientos | Registro y lectura por diagnóstico | Sí, existente | FK de diagnóstico y fechas | Odontólogo; consulta borrador para registrar | DOM, HTTP y SQL | Registro completado; edición longitudinal de estado no implementada |
| Recetas | Múltiples medicamentos, lectura en expediente | Sí, existente | Receta/detalles atómicos | Odontólogo | DOM, HTTP y SQL | Completada; detalle inválido revierte receta completa |
| Finalizar consulta | Botón en expediente | PATCH institucional | Finalización y cita completada en una transacción | Odontólogo autor de la consulta | DOM, HTTP y SQL | Completada; otro profesional rechazado |
| Historial y archivado | Expediente consolidado y motivo | Sí, existente | Snapshot y archivo existentes | Odontólogo | DOM, HTTP y SQL | Completada |
| Panel técnico local | Sí | Estado de PostgreSQL | Ping | Ambos roles | DOM y HTTP | No valida certificado ni disponibilidad de Supabase |
| Entrega administrativa de recetas | No | No | El esquema no modela entrega | Pendiente definir acceso administrativo | No | Pendiente modelo y coordinación de privacidad |
| Consulta en red | Búsqueda, cuatro tarjetas y ficha reducida de solo lectura | buscarEnRed/obtenerHistorialEnRed y ambas rutas GET | Solo listarPacientes/obtenerHistorial de repositorios existentes | Cuatro perfiles; proyección por rol/origen; escritura rechazada | MockAdapter, Supertest y DOM | Dental real en Docker; cuatro fuentes simuladas; integración completa pendiente |

Los responsables con DPI duplicado producen 409: esta entrega registra nuevos
responsables; no incorpora un buscador/reutilización/edición global de responsables
existentes ni borrado de relaciones. El contacto permite actualizar valores,
pero no borrar campos con una cadena vacía. Las alergias solo usan el catálogo
aprobado; no se agrega administración de catálogos.

## Verificación ejecutada

- `npm run lint`: aprobado.
- `npm test` con `ALBA_ODONTOLOGIA_DESECHABLE=1`: **338/338, 34 archivos**.
  Sin esa variable, la prueba del contenedor se omite deliberadamente.
- `npm run verificar:aislamiento`: aprobado con repositorios simulados.
- `git diff --check`: aprobado.
- `node scripts/verificar-odontologia-visual.js`: seis capturas Chrome vía
  DevTools, viewport real de 1440/390 px, sin desbordamiento de página, cierre de
  sesión visible y 32 piezas presentes. Se revisaron imágenes de dashboard,
  red y odontograma. Se corrigió el ancho mínimo móvil y se hicieron visibles
  todas las secciones del menú. Los fixtures no son datos reales ni prueban el
  despliegue; las capturas están en `artifacts/odontologia/`.
- PostgreSQL 16 Alpine efímero, puerto aleatorio limitado a 127.0.0.1 y datos
  ficticios. DDL base, propuesta de documento y permisos/RLS ejecutados allí.
  Todas las operaciones funcionales se ejecutaron como
  `red_salud_odontologia_api`, sin superusuario ni bypass RLS. Los fixtures se
  prepararon con el dueño solo dentro del contenedor.
- La prueba crea una base propia y la elimina al terminar. No usa DATABASE_URL
  ni carga archivos de entorno. Para reproducir: crear el contenedor
  `alba-odontologia-validacion` con PostgreSQL 16, publicación localhost y
  autenticación trust solo para ese entorno aislado; habilitar la variable
  indicada al ejecutar Vitest. Nunca apuntar esta prueba a una base externa.
- Se verificaron transacciones de menores, rechazo de doble reserva, cambio de
  cita, agenda por profesional, FK clínica, procedimientos, tratamientos,
  rollback de receta, cierre por autor, cita completada, archivo y rechazo de
  escrituras posteriores. Se corrigió un error real de clasificación 404/409
  causado por la política RLS al usar SELECT FOR UPDATE sobre filas archivadas.
- Compatibilidad HTTP con routers reales de Hospital, Odontología y Pediatría
  de main y repositorios simulados. Caídas recíprocas 503 comprobadas.
  Las pruebas unitarias existentes de MongoDB, Firestore y MariaDB pasaron.
  Esto no certifica una ejecución contra las cuatro bases reales.
- No hay suite compartida en `tests/contract/` en esta base local. El PR #23
  fusionado remotamente añade una; no se certifica equivalencia LSP completa
  con cuatro motores. Las pruebas existentes de los otros adaptadores pasan.

## PR #23 y dependencias del equipo

Se volvió a consultar el [PR #23](https://github.com/Dom-cs13/proyecto-bd2/pull/23):
**fusionado remotamente** el 2026-11-09 03:19:38 UTC, head
`07e5ee8421e4d4c7a638b69c30abb384be7dadb9`, merge `620f8e2587581e4b01b7a9a8c178701772c8a096`.
Esta rama conserva su base local `f9cf2b8`: no se hizo merge, pull ni rebase.
Se consultó el contrato v1.0 remoto y los roles emitidos por Laboratorio.

1. El contrato propuesto describe `estado` en la raíz del historial y motivo de
   archivo como string. Odontología usa `historial.estado` y `{ tipo, detalle }`,
   como establece AGENTS.md. Solicitar a I3 resolver la contradicción, con ADR
   si corresponde; no se adapta unilateralmente el contrato dental.
2. El middleware global propuesto termina usando jwt.decode tras fallar la
   firma. Los endpoints dentales vuelven a verificar HS256, issuer, audience,
   exp, sub, institución y rol; no confían en req.user precargado. Corregir el
   middleware común requiere autorización del equipo.
3. El router de Laboratorio declara rutas genéricas de pacientes y tiene
   selección por institución con valor de laboratorio por defecto. Debe
   coordinarse su despacho antes de certificar compatibilidad de los cuatro
   módulos. En la base local aún no se monta ese router. La suite dental prueba ceder
   solicitudes ajenas y rechazar tokens ajenos en rutas institucionales, pero
   no sustituye una integración del PR aprobado.
4. La propuesta v1.0 elimina de la tabla HTTP las operaciones clínicas comunes
   que Odontología ya implementa. Debe conservarlas o documentar su alcance.
5. La migración de documento y los permisos extendidos de
   `infra/database/postgresql/seguridad/odontologia_api.sql` requieren revisión
   y aplicación autorizada por PR. Se validaron en Docker; no se desplegaron.
   La cuenta de producción necesita los nuevos permisos para agenda,
   responsables, alergias, contacto y cierre. No se concedieron membresías ni
   se modificaron cuentas reales.
6. La red ya compone el mapa común con las fábricas dentales/pediátricas existentes
   de forma diferida. Laboratorio no se fabrica ni simula si falta su registro.
   `no_disponible` significa que la fuente no pudo consultarse o no cumple la
   identidad contractual; no es un ping ni demuestra que la base esté caída.
   La búsqueda responde 200 con resultados parciales y 503 si ninguna fuente
   puede consultarse. La consulta individual puede responder 503/404.
7. Pediatría entrega actualmente `nombres/documento/sexo` en su mapper, en lugar
   de `nombre/documentoIdentidad/genero`. La prueba con su mapper real detecta la
   incompatibilidad de identidad; la red devuelve no_disponible para ese resultado.
   La corrección corresponde a I4. No se reparan alias en el consumidor.
8. El JWT actual de Hospital no incluye issuer/audience/sub. La red acepta su
   perfil administrativo únicamente con firma HS256 válida, exp y clave
   configurada; si trae issuer/audience, se verifican. Los demás perfiles exigen
   issuer/audience institucionales. Nunca usa decode ni clave por defecto.
   Homogeneizar los emisores y eliminar fallback inseguros requiere al equipo.
9. La política conservadora de red aplica I4-01: terceros ven identidad y estado;
   no contacto, tutores, alergias, motivos de archivo, notas, recetas ni detalles
   institucionales. Odontólogo/enfermería/pediatra conservan lectura clínica solo
   en su institución. Otros permisos clínicos cruzados requieren acuerdo explícito.
10. Pendientes: entrega de recetas (estado y campos administrativos), edición de
    estado de tratamientos, login/TLS Supabase, concurrencia simultánea y validación
    de usuarios. Las capturas Chrome con fixtures ya están completas. El límite de
    espera en red no cancela una consulta que el driver ya está ejecutando.

## Matriz de las tareas de la actualización

| Tarea | Implementado y probado | Requiere validación real | Depende del equipo |
|---|---|---|---|
| I2-02 | Casos de uso inyectados, Promise.allSettled, timeout y pruebas con MockAdapter; solo dos lecturas permitidas | Cuatro fuentes simultáneas | Registro Lab y forma canónica pediátrica |
| I2-03 | Ambas rutas GET montadas, JWT, validación, permisos y proyección positiva | Login y claves de cada entorno | Unificación de emisores y contradicciones del contrato remoto |
| I2-10 | Supertest con admin Hospital, odontólogo, laboratorista y pediatra; escritura en red prohibida; cada motor simulado caído | Dental leído mediante HTTP/SQL en Docker completado; demás bases no consultadas | Integrar los cambios remotos sin sobrescribir este trabajo |
| I2-11 | 32 piezas, O/I/M/D/V/L/P, selección sobre fila activa y guardado mediante consulta; estilos y navegación contextual; Chrome desktop/móvil | Usabilidad con usuarios y sesión desplegada | Ningún cambio de esquema para odontograma; aceptación de producto pendiente |
| I2-13 | Comparativo contrastado; 14 bloques SQL de solo lectura ejecutados en Docker | Consultas autorizadas en Supabase; TLS/respaldos/latencia no observados | Revisión cruzada por otro integrante |

No se declara Odontología completamente finalizada ni integrada con las cuatro
instituciones mientras estas dependencias sigan abiertas.
