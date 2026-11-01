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

## Sesion 2 - 2026-11-01 - Tarea I2-06

- **Objetivo de la sesion:** Implementar la primera parte del adaptador PostgreSQL para Odontologia.
- **Que hice:** Cree connection.js, mapper.js y PostgresAdapter.js. Implemente registro, busqueda y consulta de pacientes, lectura basica del historial y archivado con motivo. El registro crea el historial inicial dentro de una transaccion.
- **Decisiones tomadas:** Utilizar el driver oficial pg, consultas parametrizadas y transacciones SQL. Mantener el codigo dentro del adaptador de Odontologia, sin modificar los contratos compartidos ni otros motores.
- **Pruebas realizadas:** Conexion real mediante pg.Pool, registro y consulta de pacientes, archivado persistente y recuperacion de consultas basicas en PostgreSQL 16 local. Vitest: 8/8 pruebas aprobadas. ESLint sin errores.
- **Problemas o bloqueos:** El puerto HistorialRepository y los esquemas Zod definitivos todavia no estan implementados en esta copia del repositorio. Falta comprobar compatibilidad contractual e integracion HTTP. El historial aun no incluye los detalles completos de diagnosticos, tratamientos y recetas; corresponden a I2-07.
- **Evidencia:** Rama feat/I2-06-postgres-adapter-p1, pruebas unitarias en tests/unit/postgresql/ y pruebas locales con Docker.
- **Tiempo invertido:** No registrado.
- **Siguiente paso:** Revisar las pruebas y el contrato, publicar PR de I2-06 y continuar posteriormente con I2-07. No se realizaron cambios en Supabase.
