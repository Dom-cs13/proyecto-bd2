# Regla de arquitectura

Cumple siempre `AGENTS.md` (raíz del repositorio).

Capas prohibidas:

- `src/domain/**` y `src/application/**`: sin imports de `pg`, `mongodb`, `firebase-admin` ni `mariadb`; sin SQL, `.collection()` ni `.doc()`.
- Adaptadores (`src/infrastructure/adapters/**`): sin reglas de negocio; toda salida pasa por `mapper.toDomain()`.
- Frontend: `fetch` solo en `frontend/js/api/`; nunca conexión directa a una base.
- Sin ORMs ni ODMs.
