# Informe local de Odontología · I2-01 a I2-13

Fecha: 2026-11-06. Rama: `feat/I2-03-integracion-api`.
Se conservaron los cambios locales anteriores y los archivos no rastreados.
No hay commits nuevos (`git log main..HEAD --oneline` sin salida), push ni merge.
Este informe registra la fase integral previa. Los cambios y resultados de la
revisión posterior están en [Estabilización de Odontología](odontologia-estabilizacion.md).

## Estado por tarea

| Tarea | Avance verificable en esta rama | Pendiente para cierre formal |
|---|---|---|
| I2-01 | [Diccionario de las 20 entidades odontológicas y clasificación](entrega-1/I2-odontologia-diccionario.md) | El criterio pide las cuatro instituciones; no se modifican ni validan sus módulos |
| I2-02 | Casos clínicos con repositorio inyectado y pruebas; diagnóstico, tratamiento, receta y consulta | Lectura de red y prueba con MockAdapter compartido dependen de coordinación de fábrica/contrato |
| I2-03 | HTTP, validadores, JWT, roles, errores, archivo y Supertest | `/red/...`, middleware global y despacho de routers compartidos; PR #23 abierto |
| I2-04 | Se conserva el modelo y DDL de 20 tablas; diccionario documenta relaciones y piezas | Revisión con contrato congelado y retroalimentación de Entrega I no aportada |
| I2-05 | DDL original conservado; migración separada de documento e índice único preparada | No ejecutar en Supabase; falta validar/aplicar SQL por el flujo del equipo |
| I2-06 | Registro transaccional, ficha, búsqueda por texto/documento/estado, archivo, mapper y aislamiento | Aplicar migración; completar documento de filas antiguas; equivalencia de salidas antiguas |
| I2-07 | Métodos del puerto delegan a operaciones clínicas existentes; historial consolida diagnósticos, tratamientos, recetas y servicios/piezas; consulta y atención completa conservan servicios con transacción probada sobre pool simulado | Prueba real de SQL y suite contractual común; `registrarAtencionCompleta` anterior no es una ruta HTTP nueva |
| I2-08 | Seeds ficticios protegidos, SQL de grupo mínimo/RLS y script de comprobación manual preparados | SQL no ejecutado; revisión de políticas efectivas, TLS, extensión de autenticación y cuenta de servicio |
| I2-09 | Componente compartido nuevo de registro/búsqueda/tabla/detalle; cliente institucional nuevo que reutiliza el cliente existente; portal conectado | Integración de esos componentes en otras instituciones fuera de alcance |
| I2-10 | Supertest comprueba que los usuarios de otras instituciones no resuelven repositorios dentales y los permisos secretaría/odontólogo; la estabilización prueba que esas peticiones continúan a un router posterior | No certifica escrituras en los cuatro motores ni lectura parcial de red con uno caído |
| I2-11 | Portal autenticado: pacientes, expediente, consulta con varias piezas, diagnósticos, tratamientos, recetas con varios medicamentos, archivo y estado técnico; tests DOM | Validación visual real, retroalimentación de Entrega I y consulta de red; citas son P2 según sección 3.1 |
| I2-12 | [Comparativo preliminar con evidencias y límites](entrega-2/I2-postgresql-comparativo.md) | Depende de Convergencia 2/I1-09 y de validación de despliegue; no se afirma rendimiento ni RLS en producción |
| I2-13 | Matriz de afirmaciones y respaldo en el comparativo | Revisión cruzada por otra persona todavía pendiente |

## Programación realizada

- API institucional y casos de uso: registro y consultas de pacientes; archivo;
  consultas clínicas, diagnósticos, tratamientos y recetas con usuario del JWT.
- Adaptador existente: alias del puerto sin eliminar métodos anteriores,
  parámetros SQL, búsquedas por documento/estado, consolidación clínica,
  transacción con servicios/piezas, fechas ISO y MotorNoDisponible en fallos de
  conexión. Catálogos y diagnóstico técnico locales.
- Compatibilidad: entrada canónica `nombre`/`genero`/`documentoIdentidad` y entrada
  anterior; mapper conserva alias y agrega nombres canónicos. No se modificaron
  Zod compartido ni el puerto. No se declara equivalencia contractual completa:
  documentos faltantes y forma de Historial requieren coordinación.
- Frontend: usa los componentes compartidos nuevos y el cliente existente. No
  se conectan bases desde el navegador. Navegación, carga, vacíos, errores,
  reintento, expiración de sesión, escape HTML y prevención de doble envío.
- Artefactos SQL: migración, seeds, rol mínimo, políticas y verificación manual.
  No se ejecutan desde npm test ni al iniciar Express.

## Evidencias de pruebas por fase

| Fase | `npm run lint` | `npm test` |
|---|---|---|
| Estado anterior preservado | Aprobado en sesión anterior | 110/110, 16 archivos |
| 1 · Backend clínico/consolidación/piezas | Aprobado | 149/149, 18 archivos |
| 2 · Cliente HTTP y portal con DOM simulado | Aprobado tras corregir globals del test | 163/163, 19 archivos |
| 3 · Documento, mapper canónico y artefactos SQL | Aprobado | 168/168, 19 archivos |
| 4 · Componentes compartidos y varias piezas por consulta | Aprobado | 169/169, 19 archivos |
| 5 · Consistencia de servicios en atención completa existente | Aprobado | **170/170, 19 archivos** |

Última ejecución de esta fase previa: Vitest 2026-11-06 20:00:13, duración reportada 5.69 s;
lint terminó con código 0. El horario es el emitido por el proceso del entorno.
Todas las conexiones de nuestras pruebas son simuladas. La suite incluye
rollback de receta por fallo en un medicamento (prueba preexistente conservada),
rollback de consulta por fallo en un servicio, normalización frente al Zod de
paciente, JWT/roles/aislamiento, filtros SQL, formularios DOM, múltiples piezas,
múltiples medicamentos, escape HTML y respuestas obsoletas tras navegar. La
última fase comprueba también rollback de servicios en `registrarAtencionCompleta`.

No se ejecutaron pruebas reales de PostgreSQL, SQL/RLS, TLS, navegador visual,
ni red entre motores. No existe todavía una suite compartida de contrato
implementada en `tests/contract/` en esta rama. Los pools simulados verifican el
código y la secuencia transaccional; no sustituyen la validación del motor.

Se añadió `jsdom` exclusivamente como dependencia de desarrollo. La instalación
de npm reportó 9 vulnerabilidades moderadas del árbol completo y una advertencia
del rango de Node de Vitest con Node 25.9.0. No se aplicó `npm audit fix` ni se
actualizaron dependencias ajenas; el CI debe usar una versión de Node soportada
por Vitest (por ejemplo, Node 24). Las pruebas locales sí terminaron en verde.

## Coordinación pendiente

El [PR #23](https://github.com/Dom-cs13/proyecto-bd2/pull/23) se volvió a consultar:
abierto, sin merge, head `edd0e5f649a38949752b38e33978631c49784bd5`. No se incorporó.
Propone rutas genéricas, middleware global y fábrica compartida. Antes de unir
ambos avances se necesita despacho por institución verificada y acuerdo sobre
forma del historial y motivo de archivo. No se creó una fábrica alternativa
para los cuatro motores ni endpoints de red parciales.

`crearCita`/`listarCitas` son explícitamente P2 del puerto, solo después de que
los cuatro adaptadores los implementen (plan 3.1). Tampoco se inventaron rutas
de gestión de responsables, alergias, pólizas o auditoría sin casos de uso y
permisos acordados. La navegación autenticada muestra los flujos disponibles;
la maqueta anterior queda accesible solo mediante preview explícito.

## Archivos del avance local acumulado

- Montaje/dependencias: `src/app.js`, `package.json`, `package-lock.json`.
- Aplicación: `src/application/useCases/odontologiaPacientes.js`.
- HTTP: `src/interfaces/http/controllers/odontologiaPacientes.js`,
  `middleware/odontologiaJwt.js`, `routes/odontologiaPacientes.js`,
  `routes/odontologiaAuth.js`, `validators/odontologia.js`.
- Infraestructura: `src/infrastructure/config/odontologiaRepositoryFactory.js`,
  `src/infrastructure/adapters/postgresql/{PostgresAdapter,connection,mapper}.js`.
- Frontend: `frontend/odontologia/js/{app,portalApi}.js`,
  `frontend/odontologia/css/tema.css`, `frontend/shared/js/api/odontologia.js`,
  `frontend/shared/js/components/pacientes.js`. No se modificaron componentes
  compartidos anteriores ni las páginas de otras instituciones.
- Pruebas: `tests/integration/{odontologiaPacientes,odontologiaClinica}.test.js`,
  `tests/unit/odontologiaFrontend.test.js`,
  `tests/unit/postgresql/PostgresLecturaClinica.test.js`.
- SQL: `infra/database/postgresql/ddl/odontologia_documento_i2.sql`,
  `seeds/odontologia_ficticia.sql`, `seguridad/odontologia_api.sql`,
  `seguridad/verificar_local.sql` y `infra/database/postgresql/README-I2.md`.
- Documentación: este informe, `docs/odontologia-api-I2-03.md`,
  `docs/entrega-1/I2-odontologia-diccionario.md`,
  `docs/entrega-2/I2-postgresql-comparativo.md`, bitácora I2.

Los archivos locales preexistentes `I2-05_archivos_para_repositorio.zip`,
`I2-05_archivos_para_repositorio/`, `docs/borradores/` y `pruebas-locales/`
no fueron editados, borrados ni incorporados al código.
