# Proyecto Final · Bases de Datos II

Plataforma clínica con 4 frontends (uno por institución), una API Express y 4 adaptadores de base de datos detrás de un mismo puerto (`HistorialRepository`).

| ID | Institución | Motor |
|---|---|---|
| I1 | Hospital General | MongoDB Atlas |
| I2 | Clínica Odontológica | PostgreSQL (Supabase) |
| I3 | Laboratorio Clínico | Firebase Firestore |
| I4 | Centro Pediátrico | MariaDB local (Docker) |

## Documentación

- Plan, calendario y reglas: [docs/planificacion/PLANIFICACION.md](docs/planificacion/PLANIFICACION.md)
- Reglas para IAs: [AGENTS.md](AGENTS.md)
- Contrato HTTP: [contratos/API.md](contratos/API.md)


## Cómo levantar todo

```bash
npm ci
npm run dev          # API + frontend estático en http://localhost:3000
npm run lint         # Reglas DIP y de frontend
npm test             # Vitest + Supertest
```

Las credenciales van en `.env` (copiar de `.env.example`). MariaDB con Docker se agrega en I4-02.

## Cómo se trabaja

1. `git switch main && git pull`, luego rama `feat/I#-XX-…`.
2. Cada quien toca su adaptador, su `infra/database/<motor>/`, su `frontend/<institucion>/` y su bitácora.
3. PR con título `[I#-XX] …`. El CI revisa título, conflictos con `main`, bitácora, secretos, lint y pruebas; sin CI en verde no se hace merge.
