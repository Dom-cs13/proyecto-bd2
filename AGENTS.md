# AGENTS.md · Reglas para todas las IAs

Proyecto Final Bases de Datos II. Una plataforma (frontend + API Express) con 4 adaptadores de base de datos detrás de un mismo puerto. Fuente de verdad del calendario y las reglas: `docs/planificacion/PLANIFICACION.md`.

## Asignación fija (no se cambia)

| ID | Institución | Motor |
|---|---|---|
| I1 | Hospital General | MongoDB Atlas |
| I2 | Clínica Odontológica | PostgreSQL (Supabase) |
| I3 | Laboratorio Clínico | Firebase Firestore |
| I4 | Centro Pediátrico | MariaDB local (Docker) |

## Arquitectura

Hexagonal. Una API, 4 adaptadores y 4 frontends (uno por institución, sobre `frontend/shared/`). Capas: `src/domain` → `src/application` → `src/interfaces/http` y `src/infrastructure`. Un solo puerto `HistorialRepository` (`src/domain/ports/`) y un adaptador por motor (`src/infrastructure/adapters/<motor>/`).

## Reglas obligatorias

1. **DIP.** En `src/domain/` y `src/application/` está prohibido importar `pg`, `mongodb`, `firebase-admin` o `mariadb`, y escribir SQL, `.collection()` o `.doc()`. Los casos de uso reciben el repositorio inyectado.
2. **LSP.** Los 4 adaptadores devuelven exactamente la misma forma:
   - `id` siempre `string`.
   - Campos en camelCase (nunca `_id`, `snake_case` ni nombres de columna).
   - Fechas ISO-8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`), nunca `Date` ni `Timestamp`.
   - Datos propios de cada institución en `detallesInstitucion`.
   - El estado de archivo vive solo en `historial.estado`.
3. **Solo 3 patrones:** Ports & Adapters, Factory/Strategy (`RepositoryFactory`) y Data Mapper (`mapper.js`). No se agregan más.
4. **YAGNI/KISS.** Sin ORMs ni ODMs (ni Prisma, TypeORM, Sequelize, Mongoose): solo drivers oficiales. Un puerto, un adaptador por motor. Objetos planos + Zod, sin clases con getters/setters. No programar lo extra (P2) antes de la Convergencia 2.
5. **DRY.** Una sola suite de contrato para los 4 motores. Las validaciones de negocio viven en `application/` o `interfaces/http/validators`, nunca en los adaptadores. El `fetch` del frontend solo existe en `frontend/shared/js/api/`; los 4 frontends (`frontend/<institucion>/`) importan de `frontend/shared/` sin copiar.
6. **Zod manda.** Si el código y `contratos/API.md` difieren, manda Zod y se corrige el `.md` en el mismo PR. Tras la Convergencia 1 el contrato solo cambia con un ADR y aprobación de I3.
7. **Seguridad.**
   - Las credenciales solo viven en `.env`. **Nunca leas ni imprimas `.env*`.**
   - El navegador nunca se conecta a una base.
   - **Escritura local:** toda ruta que escribe usa `obtenerRepositorio(req.user.institucion)` (del JWT).
   - **Lectura en red:** solo las rutas `/red/...` usan `obtenerTodos()` y únicamente llaman a `listarPacientes` y `obtenerHistorial` (sección 3.5 del plan).
   - Las IAs no escriben directo en las bases: los cambios de esquema van en `infra/database/<motor>/` y por PR.
   - Los MCP de bases de datos son de solo lectura.
8. **Aislamiento.** Si un motor no responde, el adaptador lanza `MotorNoDisponible` y el `errorHandler` responde `503` solo para esa institución.

## Formato de error único

`{ "error": { "codigo": "PACIENTE_ARCHIVADO", "mensaje": "…" } }` con códigos 400, 401/403, 404, 409 y 503.

## Git

- Rama: `feat/I1-06-mongo-adapter-p1`, `fix/I2-05-ddl-checks`, `docs/I4-06-entrega-1`.
- Título de PR/commit: `[I1-06] MongoAdapter parte 1: pacientes e historial (#NN)`.
- Sin push directo a `main`. Todo por PR con CI en verde y aprobación del dueño (CODEOWNERS).
- Cada PR incluye la entrada de bitácora de la sesión (`docs/bitacoras/`).

## Skills del proyecto

`.agents/skills/`: `crear-adaptador`, `verificar-contrato`, `disenar-ddl-sql`, `modelo-documental`, `escribir-bitacora`, `revisar-pr`, `consultar-plan` (leer el plan por partes) y `leer-datos` (inspección de bases en solo lectura). Las reglas generales viven aquí, no se repiten en las skills.
