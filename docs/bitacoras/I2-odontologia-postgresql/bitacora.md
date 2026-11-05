# Bitácora · I2 · Clínica Odontológica · PostgreSQL (Supabase)

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión N · AAAA-MM-DD · Tarea I2-XX

- **Objetivo de la sesión:** …
- **Qué hice:** …
- **Decisiones tomadas (y por qué):** …
- **Problemas / bloqueos:** …
- **Evidencia:** PR #…, commit …
- **Tiempo invertido:** … min
- **Siguiente paso:** …

## Sesión 1 · 2026-10-30 · Tarea I2-09

- **Objetivo de la sesión:** Corregir las observaciones documentales del CI del PR #8 y dejar evidencia del arranque visual de `frontend/odontologia/`, publicado previamente. Este avance corresponde parcialmente a I2-09; no cierra la tarea completa ni I2-11.
- **Qué hice:** Documenté el avance del commit `19b637bd9b8b4bf46722d76f27c4c1c3e5429c9f`: creación de los dashboards de secretaria y odontólogo con identidad Alba Suite, tipografía compartida, iconos SVG y diseño adaptable. Secretaría prioriza atención rápida, fichas, agenda y gestión administrativa; odontología prioriza pacientes por atender, expediente, trabajo clínico y seguimiento. Se prepararon recorridos visuales que conservan el paciente de ejemplo al navegar y muestran las operaciones pendientes como «Próximamente» o «En desarrollo».
- **Decisiones tomadas (y por qué):** Mantener el trabajo dentro de `frontend/odontologia/`, reutilizar la tipografía y las utilidades de sesión existentes sin modificar componentes compartidos ni otras instituciones. El modo demostración funciona solo en localhost y sin sesión existente, con vistas `?preview=secretaria` y `?preview=odontologo`, selector temporal y ejemplos ficticios; no genera tokens, no guarda datos ni representa autorización real. La entrada local sin parámetros abre secretaría. No se conectó Supabase ni se implementó backend.
- **Problemas / bloqueos:** El PR se publicó con un título fuera del formato `[I2-XX]` y sin entrada de bitácora. La carga local sin barra final había provocado rutas incorrectas para CSS y JavaScript; ese problema ya está corregido en el commit de evidencia. Siguen pendientes la búsqueda real, formularios completos, registro y actualización de datos, gestión efectiva de citas, emisión y entrega de recetas, persistencia y permisos del backend. Los componentes compartidos de pacientes de I2-09 y la integración con componentes de otros integrantes no están completos.
- **Evidencia:** [PR #8](https://github.com/Dom-cs13/proyecto-bd2/pull/8), commit [`19b637bd9b8b4bf46722d76f27c4c1c3e5429c9f`](https://github.com/Dom-cs13/proyecto-bd2/commit/19b637bd9b8b4bf46722d76f27c4c1c3e5429c9f). En la validación previa del avance se comprobaron ambas vistas en Chrome a 1440 y 390 px, 11 recorridos administrativos y 9 clínicos, el selector temporal, la conservación del contexto del paciente y la separación visual por rol; sin errores JavaScript, recursos 404 ni desbordamiento horizontal. También pasaron `node --check`, la revisión de rutas e imports y `git diff --check`. ESLint y Vitest no se ejecutaron localmente porque no estaban instaladas las dependencias. Estas pruebas corresponden al avance publicado y no a una nueva ejecución de pruebas de frontend en esta sesión documental.
- **Tiempo invertido:** No registrado.
- **Siguiente paso:** Publicar esta entrada en la misma rama, verificar la nueva ejecución del CI y atender únicamente observaciones dentro del alcance de I2. Continuar la siguiente etapa del frontend después de revisar el resultado con el equipo.

## Sesión 2 · 2026-10-31 · Tareas I2-04 e I2-05

- **Objetivo de la sesión:** Revisar el modelo odontológico y preparar una propuesta relacional/DDL compatible con el contrato y el checklist vigente, sin conectarse a Supabase.
- **Qué hice:** Comparé el modelo de 18 tablas y el SQL original con el borrador I2-05, `contratos/API.md`, `AGENTS.md` y las secciones 3.4 y 7.2 de la planificación. Preparé el DDL propuesto de 20 tablas, un diagrama ER Mermaid y un documento de decisiones y diferencias. Se conservaron intactos los borradores recibidos.
- **Decisiones tomadas (y por qué):** Se propone seguir el checklist: identity `GENERATED ALWAYS`, archivo como `historial_clinico.estado`, FK compuesta cita-consulta, cita única por usuario/fecha/hora, columnas FDI 11–48 y superficie opcional en `consulta_servicio`, más aseguradora/póliza. Se dejó RLS habilitado sin políticas para denegar acceso por defecto hasta I2-08. No se modificó el contrato compartido; las decisiones clínicas y los estados siguen sujetos a aprobación.
- **Problemas / bloqueos:** No fue posible ejecutar validación sintáctica ni creación en PostgreSQL temporal porque el terminal del entorno no está disponible. No se ejecutó SQL en Supabase. Requieren aprobación la póliza y su vínculo a paciente, los estados, dentición/superficies, zona horaria, semántica de usuario de cita y las políticas/roles RLS.
- **Evidencia:** Rama `feat/I2-05-ddl-odontologia`, basada en `main`/`origin/main` `b0b97fc`. Inspección estática: 20 tablas, 18 columnas identity, 21 FKs y 20 activaciones RLS; no hay `BY DEFAULT`, borrado en cascada ni tabla dental separada del borrador. Archivos propuestos: `infra/database/postgresql/ddl/odontologia_i2_04_i2_05.sql` y `infra/database/postgresql/ddl/odontologia_modelo_i2_04.md`. Sin PR ni commit; no se solicitó commit.
- **Tiempo invertido:** No registrado.
- **Siguiente paso:** Revisar y aprobar las decisiones pendientes; ejecutar pruebas de sintaxis y creación en PostgreSQL local temporal; completar roles y políticas RLS en I2-08 antes de habilitar acceso.

## Sesión 3 · 2026-10-31 · Tarea I2-05

- **Objetivo de la sesión:** Registrar los resultados de las pruebas locales del DDL PostgreSQL y dejar constancia de las restricciones funcionales y de seguridad aún pendientes.
- **Qué hice:** Actualicé la documentación de I2-04/I2-05 con los resultados reportados de PostgreSQL 16 y precisé las decisiones pendientes sobre citas canceladas, odontograma y RLS. No cambié las 20 tablas ni las reglas funcionales.
- **Decisiones tomadas (y por qué):** Se conservan sin cambios `UNIQUE (id_usuario, fecha, hora)`, el alcance FDI 11–48 y RLS habilitado sin políticas; alterar estos comportamientos requiere aprobación. Se registra explícitamente que las pruebas no validan roles/políticas RLS.
- **Problemas / bloqueos:** Falta aprobación del comportamiento de horarios cancelados, cardinalidad y superficies dentales, y diseño de rol/políticas RLS. No se ejecutó SQL en Supabase. No pude verificar el estado Git actual desde este entorno porque PowerShell no está disponible.
- **Evidencia:** Resultados comunicados por el equipo para PostgreSQL 16 local: 20 tablas, 21 FKs, 18 columnas identity, 15 `CHECK`, 20 tablas con RLS y 17 índices explícitos. Integridad: cuatro rondas (4/4, 4/4, 4/4, 3/3), total 15 comprobaciones exitosas; todas finalizaron con `ROLLBACK`. Los resultados no se presentan como una ejecución propia de esta sesión. Rama reportada: `feat/I2-05-ddl-odontologia`; sin commit, push ni merge.
- **Tiempo invertido:** No registrado.
- **Siguiente paso:** Confirmar los resultados en el estado local de la rama y aprobar las reglas funcionales/seguridad antes de editar el DDL o preparar la versión final para Supabase.

### Ajustes del modelo odontologico - I2-05

- Se modifico la restriccion de horarios para permitir reutilizar citas canceladas.
- Se vincularon las polizas directamente con los pacientes.
- Se agrego una FK compuesta para validar la poliza de cada consulta.
- Se realizaron cuatro pruebas adicionales de integridad en PostgreSQL 16 mediante Docker; todas fueron exitosas y finalizaron con ROLLBACK.
- No se realizaron modificaciones en Supabase ni en los modulos de otras instituciones.
## Sesion 2 - 2026-11-01 - Tarea I2-06

- **Objetivo de la sesion:** Implementar la primera parte del adaptador PostgreSQL para Odontologia.
- **Que hice:** Cree connection.js, mapper.js y PostgresAdapter.js. Implemente registro, busqueda y consulta de pacientes, lectura basica del historial y archivado con motivo. El registro crea el historial inicial dentro de una transaccion.
- **Decisiones tomadas:** Utilizar el driver oficial pg, consultas parametrizadas y transacciones SQL. Mantener el codigo dentro del adaptador de Odontologia, sin modificar los contratos compartidos ni otros motores.
- **Pruebas realizadas:** Conexion real mediante pg.Pool, registro y consulta de pacientes, archivado persistente y recuperacion de consultas basicas en PostgreSQL 16 local. Vitest: 8/8 pruebas aprobadas. ESLint sin errores.
- **Problemas o bloqueos:** El puerto HistorialRepository y los esquemas Zod definitivos todavia no estan implementados en esta copia del repositorio. Falta comprobar compatibilidad contractual e integracion HTTP. El historial aun no incluye los detalles completos de diagnosticos, tratamientos y recetas; corresponden a I2-07.
- **Evidencia:** Rama feat/I2-06-postgres-adapter-p1, pruebas unitarias en tests/unit/postgresql/ y pruebas locales con Docker.
- **Tiempo invertido:** No registrado.
- **Siguiente paso:** Revisar las pruebas y el contrato, publicar PR de I2-06 y continuar posteriormente con I2-07. No se realizaron cambios en Supabase.

## Sesion 3 - 2026-11-01 - Tarea I2-07

- **Objetivo:** Implementar las operaciones clinicas del adaptador PostgreSQL de Odontologia.
- **Trabajo realizado:** Se implementaron crearConsulta(), crearDiagnostico(), crearTratamiento(), crearReceta() y registrarAtencionCompleta().
- **Validaciones:** Las consultas requieren un historial activo. Los diagnosticos, tratamientos y recetas comprueban que los registros correspondientes esten disponibles.
- **Transacciones:** La receta guarda sus medicamentos en una sola transaccion. registrarAtencionCompleta() registra consulta, diagnosticos, tratamientos y receta dentro de una transaccion conjunta.
- **Pruebas realizadas:** PostgreSQL 16 local mediante Docker. Se verificaron registros individuales, atencion completa, COMMIT y ROLLBACK por error de clave foranea. Vitest: 15/15 pruebas aprobadas. ESLint sin errores.
- **Archivos modificados:** PostgresAdapter.js y tres archivos nuevos de pruebas unitarias.
- **Pendientes:** Validar compatibilidad con el contrato compartido, revisar integracion HTTP y seguridad de Supabase.
- **Decisiones:** No modificar otros motores, interfaces compartidas ni la base de datos de Supabase.
- **Tiempo invertido:** No registrado.
- **Siguiente paso:** Revisar los cambios y publicar el PR de I2-07 en Draft, dependiente de I2-06.
