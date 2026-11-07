# I2-12/I2-13 · PostgreSQL en Odontología: evidencia preliminar

Este documento describe código local y DDL propuesto. No es una certificación de
Supabase ni sustituye la revisión cruzada o la Convergencia 2.

Odontología tiene relaciones explícitas entre pacientes, consultas, diagnósticos,
tratamientos, recetas, medicamentos y servicios por pieza dental. PostgreSQL
permite expresar esas relaciones con FK y guardar operaciones compuestas en una
transacción. El adaptador usa el driver oficial `pg`, SQL parametrizado y un
mapper; los casos de uso reciben el repositorio, sin importar drivers.

| Afirmación | Evidencia del repositorio | Qué falta verificar |
|---|---|---|
| El modelo representa servicios por pieza/superficie | [DDL](../../infra/database/postgresql/ddl/odontologia_i2_04_i2_05.sql), `consulta_servicio` y CHECK FDI | Ejecución real de restricciones |
| La póliza y la cita deben corresponder al paciente | FK compuestas del mismo DDL | Pruebas reales de integridad en esta rama |
| Un fallo en un medicamento no confirma la receta parcial | [Test transaccional](../../tests/unit/postgresql/PostgresAdapterI207.test.js), ROLLBACK y ausencia de COMMIT | Fallo inducido sobre PostgreSQL real |
| Consulta y servicios/piezas se confirman o revierten juntos | [Tests nuevos](../../tests/unit/postgresql/PostgresLecturaClinica.test.js) y `crearConsulta` | Atomicidad en el motor real |
| Los datos se consultan mediante parámetros SQL | Filtros de documento/estado y test con texto de inyección | Evaluación de planes e índices con volumen representativo |
| El expediente incluye diagnósticos, tratamientos y recetas en una conexión/transacción de lectura | `obtenerHistorial`/`consolidarConsultas` en [adaptador](../../src/infrastructure/adapters/postgresql/PostgresAdapter.js), REPEATABLE READ READ ONLY y pruebas de secuencia/rollback | Verificar snapshot bajo concurrencia real y rendimiento |
| El backend separa secretaría y odontólogo | [Middleware JWT](../../src/interfaces/http/middleware/odontologiaJwt.js) y suites Supertest | Auditoría del entorno desplegado y gestión de cuentas |
| El navegador accede mediante API | [Cliente institucional](../../frontend/shared/js/api/odontologia.js) y pruebas de DOM | Validación visual/navegador real |
| El rol propuesto evita DDL/DELETE y limita UPDATE al archivo | [SQL de seguridad](../../infra/database/postgresql/seguridad/odontologia_api.sql) | Aplicación y prueba efectiva de RLS/roles; no se ha ejecutado |
| Se propone unicidad de documento sin inventar datos antiguos | [Migración](../../infra/database/postgresql/ddl/odontologia_documento_i2.sql) | Aplicación, backfill aprobado y posterior NOT NULL |
| El fallo de conexión de PostgreSQL se identifica como MotorNoDisponible | Pruebas query/connect del adaptador y HTTP 503 | Aislamiento de red con los cuatro motores |

El despliegue en un servicio administrado podría reducir trabajo operativo de
la clínica. En esta sesión no se verificaron respaldos, mantenimiento, TLS,
latencia ni disponibilidad de Supabase; por eso no se presentan como resultados
observados. No se comparan tiempos simulados con los de otros motores.

La estabilización alineó los bloqueos clínicos con el rol mínimo: solo bloquea
historial, cuya actualización ya está autorizada; no añade UPDATE en consulta o
diagnóstico. Se revisó contra la [documentación de privilegios de PostgreSQL](https://www.postgresql.org/docs/16/ddl-priv.html).
Esta revisión de código y documentación no sustituye ejecutar el SQL/RLS real.

Tampoco se afirma equivalencia completa de los cuatro adaptadores: la forma del
historial y las filas antiguas sin documento requieren coordinación del
contrato existente y la suite compartida del PR #23. La revisión cruzada de
I2-13 queda pendiente de otro integrante. Esta matriz deja las afirmaciones
acotadas y rastreables para esa revisión.
