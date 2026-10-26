---
name: disenar-ddl-sql
description: Escribe o revisa DDL para PostgreSQL (Supabase) o MariaDB del proyecto BD II. Úsala al crear tablas, FKs, CHECK, índices o seguridad en infra/database/postgresql o infra/database/mariadb.
---

# Diseñar DDL SQL

1. Ubica los archivos en `infra/database/<motor>/{ddl,indices,seguridad,seeds}/`. Nunca se migra desde un MCP.
2. Aplica el checklist del motor: sección 7.2 (Odontología) o 7.3 (Pediatría) de `docs/planificacion/PLANIFICACION.md`.
3. Decisiones comunes (sección 3.4):
   - Tratamiento depende de diagnóstico.
   - `UNIQUE (id_cita, id_paciente)` en `cita` y FK compuesta desde `consulta`.
   - Estado de archivo solo en `historial_clinico`.
   - `usuario.correo` `NOT NULL UNIQUE`.
   - Estados con `CHECK (… IN (…))`.
   - `UNIQUE (id_usuario, fecha, hora)` en `cita`.
4. Tipos por motor:
   - PostgreSQL: `timestamptz` e `integer GENERATED ALWAYS AS IDENTITY`.
   - MariaDB: sin índices parciales (usar trigger y documentarlo en un ADR).
5. Seguridad mínima: rol con privilegios mínimos y RLS (Supabase) o usuario con `GRANT SELECT, INSERT, UPDATE` (MariaDB).
