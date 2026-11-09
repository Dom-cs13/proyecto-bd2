# I2-12/I2-13 · PostgreSQL en Odontología: revisión de evidencia

Revisión de esta rama: 2026-11-08. Distingue análisis estático, pruebas simuladas
y ejecución en PostgreSQL 16 desechable. No certifica Supabase ni reemplaza la
revisión por otro integrante o la Convergencia 2.

Odontología tiene relaciones explícitas entre pacientes, consultas, diagnósticos,
tratamientos, recetas, medicamentos y servicios por pieza dental. PostgreSQL
permite expresar esas relaciones con FK y guardar operaciones compuestas en una
transacción. El adaptador usa el driver oficial `pg`, SQL parametrizado y un
mapper; los casos de uso reciben el repositorio, sin importar drivers.

| Afirmación | Evidencia del repositorio | Qué falta verificar |
|---|---|---|
| El modelo representa servicios por pieza/superficie | [DDL](../../infra/database/postgresql/ddl/odontologia_i2_04_i2_05.sql), `consulta_servicio` y CHECK FDI; [DOM](../../tests/unit/odontograma.test.js) y [Docker](../../tests/integration/odontologiaPostgresDesechable.test.js): 11/O y 26/M persistidos | Contrastar restricciones desplegadas con consultas 02–04 y 13; no se verificó Supabase |
| La póliza y la cita deben corresponder al paciente | FK compuestas del mismo DDL; cita/profesional/estado comprobados en adaptador; recorrido con cita en Docker | Aún no se indujo una violación de la FK de póliza en el motor; consultar definición 03 y revisión opcional 11 |
| Un fallo en un medicamento no confirma la receta parcial | [Test transaccional simulado](../../tests/unit/postgresql/PostgresAdapterI207.test.js) y prueba real Docker: segundo medicamento inexistente produce 23503 y no agrega receta parcial | Producción y concurrencia real pendientes; una consulta de solo lectura no prueba rollback |
| Consulta y servicios/piezas se confirman o revierten juntos | `crearConsulta` usa una conexión/transacción; tests simulados de rollback y lectura real de dos superficies en Docker | No se indujo fallo real de servicio intermedio; falta medir concurrencia |
| Los datos se consultan mediante parámetros SQL | Filtros de documento/estado y test con texto de inyección | Evaluación de planes e índices con volumen representativo |
| El expediente incluye diagnósticos, tratamientos y recetas en una conexión/transacción de lectura | `obtenerHistorial`/`consolidarConsultas` en [adaptador](../../src/infrastructure/adapters/postgresql/PostgresAdapter.js), REPEATABLE READ READ ONLY y pruebas de secuencia/rollback | Verificar snapshot bajo concurrencia real y rendimiento |
| El backend separa secretaría y odontólogo | [Middleware JWT](../../src/interfaces/http/middleware/odontologiaJwt.js) y suites Supertest | Auditoría del entorno desplegado y gestión de cuentas |
| El navegador accede mediante API | [Cliente institucional](../../frontend/shared/js/api/odontologia.js), pruebas de DOM y Chrome real con fixtures: seis capturas desktop/móvil, sin desbordamiento de página | Validación con sesión y servicios desplegados; fixtures no prueban Supabase |
| El rol propuesto evita DDL/DELETE y limita UPDATE por columnas | [SQL de seguridad](../../infra/database/postgresql/seguridad/odontologia_api.sql): archivo, contacto, agenda, responsables, alergias y cierre; prueba real completa con rol API y RLS en Docker | No aplicado en Supabase; revisar herencia, dueño y permisos efectivos con 05–08. La prueba no intenta DDL/DELETE para demostrar denegación |
| Se propone unicidad de documento sin inventar datos antiguos | [Migración](../../infra/database/postgresql/ddl/odontologia_documento_i2.sql), ejecutada en Docker sobre base vacía | Aplicación/backfill autorizados en Supabase y posterior NOT NULL; las filas antiguas siguen siendo un riesgo pendiente |
| El fallo de conexión de PostgreSQL se identifica como MotorNoDisponible | Pruebas query/connect y HTTP 503. [Red Supertest](../../tests/integration/consultaEnRed.test.js): cuatro perfiles, cuatro fuentes simuladas y caídas parciales; lectura dental real en Docker con otras fuentes no registradas | Aislamiento con cuatro motores reales, tiempos de red y cancelación de operaciones subyacentes pendientes |

El despliegue en un servicio administrado podría reducir trabajo operativo de
la clínica. En esta sesión no se verificaron respaldos, mantenimiento, TLS,
latencia ni disponibilidad de Supabase; por eso no se presentan como resultados
observados. No se comparan tiempos simulados con los de otros motores.

Los bloqueos de diagnóstico/tratamiento/receta recaen en historial. El cierre
añade UPDATE por columnas a consulta y cita; esta última también se bloquea al
vincular una consulta. No se concede UPDATE a diagnóstico. La prueba real Docker
ejecutó el flujo bajo RLS y descubrió/corrigió una diferencia entre lectura normal
y SELECT FOR UPDATE sobre historiales archivados. No demuestra protección si la
cuenta desplegada tiene privilegios adicionales.

Tampoco se afirma equivalencia completa de los cuatro adaptadores: la forma del
historial y las filas antiguas sin documento requieren coordinación del
contrato existente y la suite compartida del PR #23, fusionado remotamente pero
no incorporado a esta rama. La revisión cruzada de
I2-13 queda pendiente de otro integrante. Esta matriz deja las afirmaciones
acotadas y rastreables para esa revisión.

## Consultas finales exactas y límites

La lista ejecutable está en
[odontologia_solo_lectura.sql](../../infra/database/postgresql/validacion/odontologia_solo_lectura.sql).
Incluye `BEGIN READ ONLY`, límite de diez segundos y `ROLLBACK`; solo lee
metadatos/conteos y un EXPLAIN sin ANALYZE. No obtiene contraseñas, notas clínicas,
pacientes identificables ni certificados. Se ejecutó con éxito en Docker.

1. Versión y modo read-only.
2. Columnas, tipos, nullability e identity.
3. FK/UNIQUE/CHECK y sus definiciones.
4. Índices parciales: citas no canceladas, principal único y documento no nulo.
5. RLS, FORCE RLS y propiedad de tablas.
6. Políticas efectivas por tabla.
7. Superusuario/BYPASSRLS/administración de la cuenta efectiva.
8. SELECT/INSERT/DELETE/TRUNCATE/CREATE efectivos (ejecutar como API).
9. Conteos de documento nulo/vacío y grupos duplicados; requiere la columna.
10. Inconsistencias del estado de archivo, sin leer motivos.
11. Consulta y cita del mismo paciente; comprobación de póliza comentada para una cuenta revisora autorizada.
12. Horarios duplicados y más de un responsable principal.
13. Piezas FDI/superficies inválidas, solo conteos.
14. EXPLAIN de búsqueda por documento, sin ejecutar la búsqueda.

Si falta documento_identidad en 02, detenerse antes de 09/14 y documentar la
dependencia: este archivo no aplica migraciones. Si RLS limita filas, un conteo
de cero no demuestra integridad de las filas ocultas. Revisión global requiere
una cuenta revisora autorizada. Ninguna consulta demuestra respaldos, TLS,
latencia, rollback bajo error o concurrencia: esas pruebas son independientes.
