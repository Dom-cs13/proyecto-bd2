---
name: leer-datos
description: Inspecciona datos y esquemas de las 4 bases (MongoDB, PostgreSQL, Firestore, MariaDB) de forma segura, de solo lectura y con salidas mínimas. Úsala cuando haya que ver filas, documentos, esquema, índices o conteos, o depurar la forma de una respuesta de un adaptador.
---

# Leer datos con poco ruido y sin riesgo

Reglas fijas: solo lectura, solo datos ficticios, **nunca** leer ni imprimir `.env*` ni llaves de servicio. Las IAs no escriben en las bases (los cambios van en `infra/database/<motor>/` y por PR). Usa el MCP de solo lectura de tu motor; si no hay, un script desechable con el driver oficial y credenciales tomadas del entorno.

Orden para gastar pocos tokens:

1. **Esquema antes que datos.** Primero lo que ya está en el repo (`infra/database/<motor>/`) y después el esquema vivo.
2. **Cuenta antes de listar.** `COUNT(*)`, `countDocuments`, `count()` para saber el tamaño.
3. **Proyecta columnas o campos.** Nunca `SELECT *`, `find({})` sin proyección ni volcar una colección entera.
4. **Limita siempre.** `LIMIT 5` en SQL y `.limit(5)` en Mongo y Firestore. Una muestra basta para ver la forma.
5. **Un registro representativo para la forma.** Para comprobar el contrato basta un paciente con su historial, no una lista.
6. **Resume la salida.** Muestra solo los campos relevantes y di cuántas filas había en total.

| Motor | Esquema | Muestra |
|---|---|---|
| PostgreSQL (I2) | `\d tabla` o `information_schema.columns` | `SELECT col1, col2 FROM t ORDER BY id LIMIT 5` |
| MariaDB (I4) | `SHOW CREATE TABLE t` o `DESCRIBE t` | `SELECT col1, col2 FROM t LIMIT 5` |
| MongoDB (I1) | `getIndexes()` y el JSON Schema de `infra/database/mongodb/colecciones/` | `find({}, { campo: 1 }).limit(5)` |
| Firestore (I3) | `infra/database/firestore/estructura.md` | `collection('pacientes').select('campo').limit(5)` |

Para comprobar la forma LSP de lo que devuelve un adaptador, ejecuta el método del puerto con un id de seed y revisa: `id` string, camelCase, fechas ISO, sin `_id`/`Timestamp`/`snake_case`. Si la forma falla, el arreglo va en `mapper.js`, no en el consumidor.

Datos de pacientes: aunque sean ficticios, no los copies a bitácoras ni PR; cita solo ids y conteos.
