# Planificación · Proyecto Final Bases de Datos II

> Ubicación en el repositorio: `docs/planificacion/PLANIFICACION.md`
> Este documento es la fuente de verdad del calendario, la estructura del repositorio y las reglas de desarrollo. Cualquier cambio se hace por PR con el prefijo `[PLAN]`.

**Supuestos**

- Hay 4 integrantes. Cada uno es dueño de una institución y de su motor. **Los motores ya están asignados y no se cambian.**
- Hay una sola plataforma: un frontend, una API Express y 4 adaptadores detrás de un mismo puerto.
- Cada tarea (`I1-XX` a `I4-XX`) cabe en una sesión de trabajo de 45 a 90 minutos.
- El plan cubre el backend hexagonal, los 4 motores en equivalencia, las pruebas de contrato, la seguridad por motor, el **frontend funcional**, la Entrega I con correcciones y el comparativo de la Entrega II.

---

## 1. Asignación fija del equipo

| ID | Institución · Motor | Rol transversal |
|---|---|---|
| **I1** | Hospital General · **MongoDB Atlas** | Líder de arquitectura hexagonal, enrutamiento (`RepositoryFactory`) y convergencias |
| **I2** | Clínica Odontológica · **PostgreSQL (Supabase)** | Líder de modelado relacional, consistencia SQL e integración HTTP |
| **I3** | Laboratorio Clínico · **Firebase Firestore** | Líder de contratos (`contratos/API.md`, Zod, puerto) y QA (pruebas de contrato) |
| **I4** | Centro Pediátrico · **MariaDB local (Docker)** | Líder de entorno local, seeds, frontend base y documentación final |

Cada dueño escribe el diseño de su propio motor. Esto incluye el modelo documental de Mongo (I1) y de Firestore (I3). Quien lidera la documentación (I4) solo consolida.

---

## 2. Estructura del repositorio

```text
proyecto-bd2/
├── AGENTS.md                       # Reglas para TODAS las IAs (Codex y Antigravity lo leen solos). Copia de la sección 4
├── .agents/                        # Carpeta estándar de agentes (Antigravity y Codex)
│   ├── rules/
│   │   └── arquitectura.md         # Regla corta para Antigravity: "cumple AGENTS.md" + capas prohibidas
│   └── skills/                     # Skills compartidas (formato SKILL.md, ver sección 10)
│       ├── crear-adaptador/SKILL.md
│       ├── verificar-contrato/SKILL.md
│       ├── disenar-ddl-sql/SKILL.md
│       ├── modelo-documental/SKILL.md
│       ├── escribir-bitacora/SKILL.md
│       └── revisar-pr/SKILL.md
├── .claude/
│   ├── CLAUDE.md                   # "@AGENTS.md" (importa las mismas reglas) + atajos del proyecto
│   ├── settings.json               # Permisos (p. ej. prohibir leer .env) y plugins habilitados
│   └── skills/                     # Copia de .agents/skills generada con `npm run skills:sync`
├── .mcp.json                       # Servidores MCP del proyecto para Claude Code (sin secretos)
├── .github/
│   ├── workflows/ci.yml            # Lint + tests unitarios + contrato contra MockAdapter + skills sincronizadas
│   ├── pull_request_template.md    # Checklist de la sección 4.6
│   └── CODEOWNERS                  # Cada adaptador y su carpeta de BD exige revisión de su dueño
├── contratos/
│   ├── API.md                      # Contrato HTTP: rutas, campos, códigos y formato de error (sección 3)
│   └── ejemplos/                   # JSON de ejemplo por endpoint (los usan el frontend y los tests)
├── docs/
│   ├── planificacion/
│   │   └── PLANIFICACION.md        # Este documento
│   ├── bitacoras/
│   │   ├── I1-hospital-mongodb/bitacora.md
│   │   ├── I2-odontologia-postgresql/bitacora.md
│   │   ├── I3-laboratorio-firestore/bitacora.md
│   │   └── I4-pediatria-mariadb/bitacora.md
│   ├── decisiones/                 # ADR cortos: 0001-tratamiento-depende-de-diagnostico.md, ...
│   ├── diagramas/                  # ER, relacionales, documentales y de arquitectura (con nombre claro, no "Untitled")
│   ├── entrega-1/                  # Fuentes de la Entrega I (y su versión corregida)
│   └── entrega-2/                  # Comparativo por motor + PDF final
├── frontend/
│   ├── index.html
│   ├── pages/                      # login, pacientes, historial, consulta, panel-tecnico
│   ├── css/
│   └── js/
│       ├── api/                    # Único lugar que hace fetch a la API
│       ├── components/             # Tabla, formulario, alerta, layout
│       └── modules/{hospital,odontologia,laboratorio,pediatria}/
├── infra/
│   ├── compose.yaml                # MariaDB local (y Mongo/Postgres opcionales para pruebas offline)
│   └── database/
│       ├── postgresql/             # ddl/, indices/, seguridad/ (roles, RLS), seeds/
│       ├── mariadb/                # ddl/, indices/, seguridad/ (usuarios, GRANT), seeds/
│       ├── mongodb/                # colecciones/ (JSON Schema), indices/, seguridad/, seeds/
│       └── firestore/              # estructura.md, firestore.indexes.json, firestore.rules, seeds/
├── mockups/                        # Wireframes de las pantallas comunes y módulos por institución
├── scripts/
│   ├── seed-all.js                 # npm run seed:all
│   ├── check-env.js                # Verifica variables y conectividad de los 4 motores
│   └── verificar-aislamiento.js    # Apaga/simula caída de un motor y confirma 503 aislado
├── src/
│   ├── domain/
│   │   ├── entities/               # Esquemas Zod de Paciente, Consulta, Diagnostico, Tratamiento, Receta
│   │   ├── ports/HistorialRepository.js
│   │   └── rules/                  # Reglas de negocio puras (p. ej. no consultar a un paciente archivado)
│   ├── application/
│   │   └── useCases/               # Un archivo por caso de uso; reciben `repo` inyectado
│   ├── interfaces/
│   │   └── http/
│   │       ├── routes/
│   │       ├── controllers/
│   │       ├── middleware/         # auth.js (JWT), resolverRepositorio.js, errorHandler.js
│   │       └── validators/         # Zod de entrada HTTP
│   └── infrastructure/
│       ├── adapters/
│       │   ├── mock/MockAdapter.js
│       │   ├── mongodb/{MongoAdapter.js, mapper.js, connection.js}
│       │   ├── postgresql/{PostgresAdapter.js, mapper.js, connection.js}
│       │   ├── firestore/{FirestoreAdapter.js, mapper.js, connection.js}
│       │   └── mariadb/{MariaDbAdapter.js, mapper.js, connection.js}
│       └── config/
│           ├── env.js
│           └── RepositoryFactory.js
├── tests/
│   ├── unit/                       # Casos de uso con MockAdapter
│   ├── contract/                   # UNA suite que corre igual sobre los 4 adaptadores
│   └── integration/                # Supertest con los 4 usuarios institucionales
├── .env.example                    # Variables de los 4 motores, sin secretos
├── package.json
└── README.md                       # Cómo levantar todo en menos de 5 minutos
```

### 2.1 Bitácora personal (`docs/bitacoras/<ID>/bitacora.md`)

Cada integrante agrega una entrada **por sesión trabajada**, en el mismo PR de la tarea. Sirve como evidencia del trabajo individual y como fuente para redactar el comparativo.

```markdown
## Sesión N · AAAA-MM-DD · Tarea I#-XX

- **Objetivo de la sesión:** …
- **Qué hice:** …
- **Decisiones tomadas (y por qué):** …  ← si afecta a otros, abrir ADR en docs/decisiones/
- **Problemas / bloqueos:** …  (quién o qué me desbloquea)
- **Evidencia:** PR #…, commit …, captura en docs/diagramas/…
- **Tiempo invertido:** … min
- **Siguiente paso:** …
```

### 2.2 Convenciones de Git (mismo estilo que el repositorio de referencia)

- **Rama:** `feat/I1-06-mongo-adapter-p1`, `fix/I2-05-ddl-checks`, `docs/I4-06-entrega-1`.
- **Título de PR y commit squash:** `[I1-06] MongoAdapter parte 1: pacientes e historial (#NN)`.
- **Nadie hace push directo a `main`.** Todo pasa por un PR con el CI en verde y la aprobación del dueño del área tocada (según `CODEOWNERS`).
- Las convergencias usan el prefijo de la tarea de convergencia: `[I1-04] Congelamiento del contrato v1.0`.

---

## 3. Contrato común (se congela en la Convergencia 1, `I1-04`)

### 3.1 Puerto `HistorialRepository` (único, 4 implementaciones)

| Método | Entrada | Salida |
|---|---|---|
| `crearPaciente(datos)` | `PacienteNuevo` | `Paciente` |
| `obtenerPaciente(id)` | `string` | `Paciente \| null` |
| `listarPacientes(filtro)` | `{ texto?, estado?, pagina?, limite? }` | `{ items: Paciente[], total }` |
| `obtenerHistorial(pacienteId)` | `string` | `Historial` (paciente + consultas con diagnósticos, tratamientos y recetas) |
| `archivarHistorial(pacienteId, motivo)` | `string`, `{ tipo, detalle }` | `Historial` |
| `crearConsulta(datos)` | `ConsultaNueva` | `Consulta` |
| `agregarDiagnostico(consultaId, datos)` | `string`, `DiagnosticoNuevo` | `Diagnostico` |
| `registrarTratamiento(diagnosticoId, datos)` | `string`, `TratamientoNuevo` | `Tratamiento` |
| `recetarMedicamento(consultaId, datos)` | `string`, `RecetaNueva` (con `detalles[]`) | `Receta` |
| `ping()` | — | `{ ok: boolean, motor, latenciaMs }` (panel técnico y aislamiento) |

**Extensión v1.1 (P2):** `crearCita` y `listarCitas`. Estos métodos solo se agregan al puerto cuando los 4 adaptadores los implementen. Un método que solo exista en algunos adaptadores rompería Liskov. El Hospital los prioriza porque el enunciado pide control estricto de citas.

### 3.2 Reglas de forma (las valida Zod en la salida de cada adaptador durante las pruebas de contrato)

- `id` siempre es `string`, incluso cuando viene de un `int` de SQL o de un `ObjectId`.
- Los nombres de campos van en **camelCase**. No sale ningún `_id`, `snake_case` ni nombre de columna.
- Las fechas se devuelven como texto **ISO-8601**: `fechaNacimiento` como `"YYYY-MM-DD"` y los instantes como `"YYYY-MM-DDTHH:mm:ss.sssZ"`. Nunca salen como `Date`, `Timestamp` de Firestore ni `datetime` crudo.
- Los datos propios de cada institución viajan en `detallesInstitucion` (objeto), por ejemplo piezas dentales, controles de crecimiento, resultados de examen o internamiento.
- El estado de archivo vive **solo** en el historial: `historial.estado: "activo" | "archivado"`, `fechaArchivo` y `motivoArchivo: { tipo: "traslado" | "fallecimiento" | "administrativo" | "otro", detalle }`.

### 3.3 Rutas HTTP (detalle completo en `contratos/API.md`)

> No se usa OpenAPI. **La fuente de verdad del contrato son los esquemas Zod** (`src/domain/entities/` y `src/interfaces/http/validators/`). `contratos/API.md` es la versión legible para el equipo y el frontend, y `contratos/ejemplos/` guarda un JSON real por endpoint. Si el código y `API.md` no coinciden, manda Zod y se corrige el `.md` en el mismo PR.

| Método y ruta | Caso de uso |
|---|---|
| `POST /auth/login` | Autenticación y emisión del JWT con `institucion` y `rol` |
| `POST /pacientes` · `GET /pacientes` · `GET /pacientes/:id` | Registro, búsqueda y detalle |
| `GET /pacientes/:id/historial` | Historial consolidado |
| `PATCH /pacientes/:id/archivar` | Archivado con motivo |
| `POST /consultas` | Nueva consulta (con `pacienteId` y `citaId` opcional) |
| `POST /consultas/:id/diagnosticos` | Agregar diagnóstico |
| `POST /diagnosticos/:id/tratamientos` | Registrar tratamiento (el tratamiento depende del diagnóstico, igual que en los ER) |
| `POST /consultas/:id/recetas` | Receta con detalle de medicamentos |
| `GET /system/status` | Estado de los motores para el panel técnico (sin secretos ni datos clínicos) |

**Formato de error único:** `{ "error": { "codigo": "PACIENTE_ARCHIVADO", "mensaje": "…" } }`

| Código HTTP | Cuándo se usa |
|---|---|
| `400` | Validación fallida |
| `401` / `403` | Sin token o sin permiso |
| `404` | Recurso inexistente |
| `409` | Paciente archivado o duplicado |
| `503` | El motor de esa institución está caído (no afecta a las demás) |

### 3.4 Decisiones de modelado ya tomadas (cada una con su ADR en `docs/decisiones/`)

1. **El tratamiento depende del diagnóstico** en los 4 motores, tanto en SQL como en NoSQL.
2. **Consulta y cita del mismo paciente:**
   - En SQL se exige con `UNIQUE (id_cita, id_paciente)` en `cita` y una FK compuesta desde `consulta`.
   - En NoSQL lo valida el caso de uso antes de escribir.
3. **Una sola fuente de verdad para el archivo:** `historial_clinico` (se elimina `paciente.estado`, o queda solo como dato derivado y documentado).
4. **Login (propuesta, se confirma en I1-04):**
   - `POST /auth/login` recibe `{ institucion, usuario, password }` y autentica contra la tabla o colección `usuario` de esa institución.
   - A partir de ahí el JWT manda. El cliente elige dónde inicia sesión, pero **nunca** a qué base se consulta después: el `RepositoryFactory` usa solo `req.user.institucion`.
   - Si la base de una institución está caída, falla solo el login de esa institución.
5. **`usuario.correo`** es `NOT NULL UNIQUE` si se usa para iniciar sesión.
6. **Los estados** (`cita.estado`, `tratamiento.estado`) se limitan con `CHECK (… IN (…))` en SQL y con un enum Zod o JSON Schema en NoSQL.
7. **Para evitar doble reserva** se usa `UNIQUE (id_usuario, fecha, hora)` en `cita`.

---

## 4. Reglas de desarrollo limpio (obligatorias · copiadas en `AGENTS.md`)

### 4.1 SOLID: los dos principios obligatorios

**DIP: los casos de uso dependen del puerto, nunca del driver.**

- En `src/application/` y `src/domain/` está **prohibido** lo siguiente:
  - `import` de `pg`, `mongodb`, `firebase-admin` o `mariadb`.
  - SQL (`SELECT`, `INSERT`…), `.collection()` y `.doc()`.
- El caso de uso recibe el repositorio ya instanciado:
  ```js
  // src/application/useCases/crearConsulta.js
  export async function crearConsulta(repo, datos) {
    const historial = await repo.obtenerHistorial(datos.pacienteId);
    if (!historial) throw new NoEncontrado('PACIENTE_NO_EXISTE');
    if (historial.estado === 'archivado') throw new Conflicto('PACIENTE_ARCHIVADO');
    return repo.crearConsulta(datos);
  }
  ```
- Así se cumple que cambiar de motor sea solo una decisión de configuración, sin reescribir el sistema.
- **Lo hace cumplir el CI** con `no-restricted-imports` de ESLint aplicado a `src/domain/**` y `src/application/**`.

**LSP: cualquier adaptador sustituye a otro sin que nada se rompa.**

- Los 4 adaptadores devuelven exactamente las formas de la sección 3.2.
- `{ _id: ObjectId(...) }`, `fecha_nacimiento` o `Timestamp({_seconds})` fuera del adaptador **es un bug bloqueante**.
- **Lo hace cumplir** la suite de contrato, que valida cada respuesta con el esquema Zod de salida.

### 4.2 Solo tres patrones de diseño

| Patrón | Dónde | Para qué |
|---|---|---|
| **Ports & Adapters (hexagonal)** | `src/domain/ports/` + `src/infrastructure/adapters/` | Los 4 integrantes trabajan en paralelo sin tocar el código de los demás |
| **Factory / Strategy (selector por sesión)** | `src/infrastructure/config/RepositoryFactory.js` | Un mapa `institucion → adaptador`. Resuelve el enrutamiento por usuario en cada petición |
| **Data Mapper** | `mapper.js` dentro de cada adaptador | `toDomain(filaODocumento)` y `toPersistence(entidad)`: traducción de `snake_case`/BSON/Firestore a camelCase del contrato |

```js
// src/infrastructure/config/RepositoryFactory.js
const adaptadores = { hospital: mongo, odontologia: postgres, laboratorio: firestore, pediatria: mariadb };
export function obtenerRepositorio(institucion) {
  const repo = adaptadores[institucion];
  if (!repo) throw new Prohibido('INSTITUCION_INVALIDA');
  return repo;
}
```

### 4.3 YAGNI y KISS

- **No se usan ORMs ni ODMs** (ni Prisma, TypeORM, Sequelize ni Mongoose). Se trabaja con los drivers oficiales directos: `pg`, `mariadb`, `mongodb` y `firebase-admin`. El curso evalúa que ustedes controlen `BEGIN/COMMIT/ROLLBACK`, `ClientSession.withTransaction()` y `runTransaction`/`writeBatch`.
- **Un solo puerto** (`HistorialRepository`) y **un adaptador por motor**. No se divide en `PacienteRepository`, `ConsultaRepository` y similares: serían 20 clases en lugar de 4.
- **Objetos planos + Zod.** Nada de clases con getters, setters ni constructores complejos para las entidades.
- **Lo extra espera.** La edición de consultas con auditoría y los módulos especiales no se programan hasta que las operaciones obligatorias funcionen en los 4 motores (Convergencia 2).

### 4.4 DRY

- **Pruebas de contrato:** una sola suite para los 4 motores.
  ```js
  // tests/contract/historial.contract.test.js
  describe.each(adaptadoresDisponibles())('Contrato HistorialRepository · %s', (nombre, repo) => {
    test('crearPaciente devuelve la forma del contrato', async () => {
      const p = await repo.crearPaciente(pacienteFicticio());
      expect(PacienteSchema.parse(p)).toEqual(p);
      expect(typeof p.id).toBe('string');
    });
    // … misma batería para los 10 métodos
  });
  ```
- **Validaciones de negocio:** se escriben una sola vez, en `application/` o `interfaces/validators`, y **nunca** dentro de los adaptadores. Ejemplos: fecha válida, motivo obligatorio, paciente existente y no archivado.
- **Llamadas a la API desde el frontend:** solo existen en `frontend/js/api/`.

### 4.5 Seguridad (se evalúa junto con el modelado y la consistencia)

- Las credenciales solo viven en `.env`. El `.env.example` no lleva secretos. El navegador **nunca** se conecta directamente a una base.
- La clasificación pública, confidencial y restringida (I4-01) se traduce en código: el controlador filtra los campos de la respuesta según `req.user.rol`.
- Controles por motor:

| Motor | Controles |
|---|---|
| **Supabase** | Rol de base de datos con privilegios mínimos para la API y RLS en las tablas clínicas |
| **Atlas** | Usuario de base de datos con rol `readWrite` solo sobre su base y lista de IPs permitidas |
| **MariaDB** | Usuario de aplicación con `GRANT SELECT, INSERT, UPDATE` limitado a su esquema (sin `DROP` ni `GRANT`) |
| **Firestore** | Ver la nota siguiente |

- **Nota sobre Firestore:** el backend usa el Admin SDK, que **ignora las Security Rules**. La defensa se basa en IAM: una cuenta de servicio con un rol mínimo y la llave solo en el servidor. Además, `firestore.rules` se deja en *deny-all* como capa de defensa ante cualquier acceso directo desde un cliente. Esto se dice tal cual en el comparativo.

### 4.6 Checklist de cada PR (`.github/pull_request_template.md`)

- [ ] El título lleva el formato `[I#-XX] …` y corresponde a una tarea del calendario.
- [ ] No hay imports de drivers ni SQL/SDK en `domain/` o `application/`.
- [ ] Las respuestas del adaptador pasan por `mapper.toDomain` (camelCase, `id` string, fechas ISO).
- [ ] La suite de contrato está en verde (como mínimo contra `MockAdapter` y contra mi motor).
- [ ] No se agregaron secretos, datos reales ni ORMs.
- [ ] La entrada de bitácora de esta sesión está agregada.
- [ ] Si cambia el contrato: se actualizaron Zod, `contratos/API.md` y `contratos/ejemplos/`, y hubo aprobación de I3 (después de la Convergencia 1, solo con un ADR).

---

## 5. Fases e hitos

| Fase | Sesiones | Enfoque | Hito de cierre |
|---|---|---|---|
| **Fase 1** | S1–S4 | Núcleo hexagonal, contrato y API funcionando con `MockAdapter` | **Convergencia 1 (`I1-04`):** contrato v1.0 congelado |
| **Fase 2** | S4–S6 | Modelado corregido de los 4 motores, DDL, diseño documental y Entrega I | **Hito Entrega I (`I4-06`)** |
| **Fase 3** | S6–S9 | Adaptadores reales, transacciones, seeds y seguridad por motor | **Convergencia 2 (`I1-09`):** contrato en verde en los 4 motores |
| **Fase 4** | S9–S11 | Frontend, integración HTTP y correcciones de la retroalimentación | Demo completa de punta a punta con los 4 usuarios |
| **Fase 5** | S12–S13 | Comparativo, revisión cruzada y PDF final | **Convergencia final (`I1-13`)** |

> Si la retroalimentación de la Entrega I llega antes de la S11, la tarea `I#-11` se adelanta y el resto se corre una sesión.

---

## 6. Calendario de sesiones

<!-- calendario:inicio -->

| Sesión | I1 · Hospital · MongoDB | I2 · Odontología · PostgreSQL | I3 · Laboratorio · Firestore | I4 · Pediatría · MariaDB |
|---|---|---|---|---|
| **S1** | **I1-01** Repo con la estructura de la sección 2, Express base, `errorHandler`, `.env.example`, `AGENTS.md`, `.agents/` con skills base, `.claude/`, CI y ESLint con reglas DIP | **I2-01** Levantamiento de entidades y atributos de **las 4 instituciones** (núcleo común + extensiones) y diccionario de datos | **I3-01** Entidades de dominio (Zod) y puerto `HistorialRepository` con firmas exactas | **I4-01** Clasificación pública/confidencial/restringida por institución y catálogo de operaciones en lenguaje sencillo |
| **S2** | **I1-02** Casos de uso del núcleo: `registrarPaciente`, `obtenerPaciente`, `listarPacientes`, `obtenerHistorial`, `crearConsulta`, `archivarHistorial` | **I2-02** Casos de uso clínicos: `agregarDiagnostico`, `registrarTratamiento`, `recetarMedicamento` | **I3-02** `contratos/API.md` v0.9 con ejemplos JSON, esquemas Zod de salida y formato de error único | **I4-02** `compose.yaml` de MariaDB y `MockAdapter` que pasa el borrador de la suite de contrato |
| **S3** | **I1-03** JWT (`auth.js`), `RepositoryFactory`, middleware `resolverRepositorio` y decisión de login (ADR) | **I2-03** Rutas y controladores de pacientes, historial y archivado | **I3-03** Rutas y controladores de consultas, diagnósticos, `/diagnosticos/:id/tratamientos` y recetas | **I4-03** Mockups de pantallas comunes + frontend base (layout, `js/api/`, página de login) |
| **S4** | **I1-04** **Convergencia 1:** merge, guion de Fase 1 con Mock y **contrato v1.0 congelado** | **I2-04** ER y relacional **corregido** de Odontología (checklist 7.2) | **I3-04** Diseño documental del Laboratorio: colecciones/subcolecciones, qué se embebe o referencia, índices compuestos | **I4-04** ER y relacional **corregido** de Pediatría (checklist 7.3) |
| **S5** | **I1-05** Diseño documental del Hospital: colecciones, JSON Schema, índices, qué se embebe o referencia | **I2-05** DDL en Supabase: tablas, FKs, `CHECK`, índices, `timestamptz` e identity | **I3-05** `firestore.indexes.json` y `firestore.rules` deny-all | **I4-05** DDL en MariaDB: tablas, FKs, `CHECK`, índices y trigger de tutor principal |
| **S6** | **I1-06** `MongoAdapter` p1: pacientes, historial y archivo + `mapper.js` | **I2-06** `PostgresAdapter` p1: pacientes, historial y archivo + `mapper.js` | **I3-06** `FirestoreAdapter` p1: pacientes, historial y exámenes polimórficos + `mapper.js` | **I4-06** **Hito Entrega I:** compilación del PDF (cada dueño entrega su sección en `docs/entrega-1/`) |
| **S7** | **I1-07** `MongoAdapter` p2: consulta, diagnóstico, tratamiento y receta con `session.withTransaction()` | **I2-07** `PostgresAdapter` p2: lo mismo con `BEGIN/COMMIT/ROLLBACK` | **I3-07** `FirestoreAdapter` p2: lo mismo con `runTransaction` y `writeBatch` | **I4-07** `MariaDbAdapter` p1: pacientes, historial, archivo, crecimiento y vacunas + `mapper.js` |
| **S8** | **I1-08** Seeds del Hospital, `/system/status` y 503 aislado por motor | **I2-08** Seeds de Odontología + **seguridad Supabase** (rol mínimo y RLS) | **I3-08** Suite de contrato completa (`describe.each`) sobre Mock y los adaptadores listos | **I4-08** `MariaDbAdapter` p2: consulta, diagnóstico, tratamiento y receta con transacciones SQL |
| **S9** | **I1-09** **Convergencia 2:** suite de contrato en verde en los 4 motores + **seguridad Atlas** | **I2-09** Frontend: búsqueda, registro y detalle de pacientes | **I3-09** Seeds del Laboratorio (hematología, orina, cultivo), **seguridad Firestore (IAM)** y prueba de no-fuga entre instituciones | **I4-09** Seeds de Pediatría, `npm run seed:all`, **seguridad MariaDB** (usuario y `GRANT`) y `verificar-aislamiento.js` |
| **S10** | **I1-10** Frontend: vista de historial consolidado y panel técnico comparativo | **I2-10** Integración con Supertest cambiando entre los 4 usuarios institucionales | **I3-10** Frontend: formularios de consulta, diagnóstico, tratamiento y receta | **I4-10** Frontend: archivado con motivo, navegación por rol y mensajes de 401/403/409/503 |
| **S11** | **I1-11** Correcciones de la retroalimentación en Mongo + módulo Hospital (antecedentes/internamiento) | **I2-11** Correcciones de la retroalimentación en Postgres + módulo Odontología (piezas dentales) | **I3-11** Correcciones de la retroalimentación en Firestore + módulo Laboratorio (resultados por tipo) | **I4-11** Correcciones de la retroalimentación en MariaDB + módulo Pediatría (crecimiento y vacunas) |
| **S12** | **I1-12** Comparativo: MongoDB en el Hospital | **I2-12** Comparativo: PostgreSQL en Odontología | **I3-12** Comparativo: Firestore en el Laboratorio | **I4-12** Comparativo: MariaDB en Pediatría |
| **S13** | **I1-13** **Convergencia final:** cierre de código, 4 usuarios de demo y ensayo del guion | **I2-13** Revisión cruzada: cada afirmación del comparativo tiene respaldo en código o DDL | **I3-13** Corrida final: contrato + integración + aislamiento, con capturas para el PDF | **I4-13** PDF final (Entrega I corregida + comparativo + diagramas de arquitectura) |

<!-- calendario:fin -->

### 6.1 Dependencias clave (no empezar sin esto)

| Tarea | Depende de | Motivo |
|---|---|---|
| Todas las de S2 en adelante | `I1-01` | Estructura y CI |
| `I1-02`, `I2-02` | `I3-01` | Usan el puerto |
| `I2-03`, `I3-03` | `I3-02`, `I1-03` | Validadores y middleware |
| `I1-04` | Todo S1–S3 | Congelamiento del contrato |
| `I2-04`, `I4-04` | `I2-01`, `I1-04` | El modelo debe respetar el contrato congelado |
| Adaptadores p1 (`I1-06`, `I2-06`, `I3-06`, `I4-07`) | DDL o diseño documental del mismo motor | El adaptador escribe sobre el esquema ya definido |
| `I4-06` Entrega I | `I1-05`, `I2-04`, `I3-04`, `I4-04`, `I4-01` | Necesita todos los modelos |
| `I1-09` Convergencia 2 | `I3-08` y los 4 adaptadores p2 (`I4-08` incluido) | Prueba completa de equivalencia |
| Frontend (`I2-09`, `I1-10`, `I3-10`, `I4-10`) | `I4-03`, `I1-04` | Usa `js/api/` y `contratos/ejemplos/`. Puede apuntar al Mock mientras tanto |
| `I#-11` | Retroalimentación de la Entrega I | Se corrigen PDF, DDL, adaptador y seeds, no solo el documento |
| `I#-12` | `I1-09`, `I#-11` | Solo se afirma lo que ya funciona |

---

## 7. Detalle de tareas y criterio de "hecho"

### 7.1 Fase 1: núcleo y contrato

| Tarea | Hecho cuando… |
|---|---|
| **I1-01** | `npm run dev` levanta Express. `npm test` corre en CI. ESLint falla si `application/` importa un driver. Están creadas las 4 bitácoras con la plantilla. Existen `AGENTS.md`, las skills base de la sección 10 y `npm run skills:sync` |
| **I2-01** | El diccionario cubre el núcleo común y las extensiones de las 4 instituciones: piezas dentales, exámenes, crecimiento/vacunas e internamiento/citas del Hospital |
| **I3-01** | El puerto exporta los 10 métodos con JSDoc y existen esquemas Zod de entrada y salida para las 5 entidades |
| **I4-01** | Matriz campo × nivel × rol que puede verlo, más la lista de operaciones redactada para el usuario final |
| **I1-02 / I2-02** | Cada caso de uso tiene una prueba unitaria con `MockAdapter` y cero imports de drivers |
| **I3-02** | `contratos/API.md` describe todas las rutas de la sección 3.3 y hay un JSON por endpoint en `contratos/ejemplos/` que pasa su esquema Zod (hay test) |
| **I4-02** | `docker compose up -d` deja MariaDB lista y el `MockAdapter` pasa la suite de contrato |
| **I1-03** | El token lleva `institucion` y `rol`, y una petición con el token de Pediatría jamás llega a otro adaptador (hay test) |
| **I2-03 / I3-03** | Los controladores son delgados: validan, llaman al caso de uso y responden con el formato de error único |
| **I4-03** | Wireframes en `mockups/`, layout común y login funcionando contra el Mock |
| **I1-04** | Se ejecuta el guion de verificación de la Fase 1 y se publica el tag `contrato-v1.0` |

**Guion de verificación de la Fase 1**

1. Se levanta Express con el `MockAdapter`.
2. Se inicia sesión y el JWT trae la institución.
3. Se registra un paciente, se abre una consulta, se agrega un diagnóstico, luego un tratamiento (desde el diagnóstico), luego una receta, y se archiva el paciente. Todo responde `200/201` con la forma del contrato.
4. Crear una consulta para el paciente archivado responde `409 PACIENTE_ARCHIVADO`.

### 7.2 Checklist del modelo corregido · Odontología (`I2-04`, `I2-05`)

- [ ] `consulta_servicio.pieza_dental` (FDI 11–48, `CHECK`) y `superficie` opcional. Si no se modelan presupuestos, se quitan del comparativo.
- [ ] `alergia` + `paciente_alergia`, porque se recetan medicamentos y anestesia.
- [ ] Tipos de Postgres: `timestamptz` en lugar de `datetime` e `integer GENERATED ALWAYS AS IDENTITY` en las PK.
- [ ] `poliza_seguro`:
  - `UNIQUE (id_aseguradora, numero_poliza)`
  - `CHECK (porcentaje_cobertura BETWEEN 0 AND 100)`
  - `CHECK (fecha_vencimiento >= fecha_inicio)`
- [ ] `consulta.id_poliza` opcional, para saber qué cobertura se aplicó.
- [ ] Decisiones comunes de la sección 3.4: FK compuesta cita↔consulta, estado de archivo único, `CHECK` de estados, `UNIQUE` de cita y correo de usuario.
- [ ] Bonus de Postgres para el comparativo: índice único parcial donde aplique y RLS.

### 7.3 Checklist del modelo corregido · Pediatría (`I4-04`, `I4-05`)

- [ ] `esquema_vacunacion` se renombra a **`vacuna_aplicada`**, con `UNIQUE (id_paciente, id_vacuna, numero_dosis)` y, de forma opcional, `id_consulta` o `id_usuario` para saber quién la aplicó.
- [ ] Nueva tabla **`esquema_vacunacion`** real: `id_vacuna`, `numero_dosis` y `edad_recomendada_meses`. Respalda la justificación de "dosis/edad".
- [ ] `control_crecimiento` con `UNIQUE (id_consulta)` y `CHECK` de rangos positivos.
- [ ] Tutor principal único: como MariaDB no tiene índices parciales, se resuelve con un trigger y se documenta en un ADR.
- [ ] `nivel_severidad` con `CHECK` o catálogo.
- [ ] Decisiones comunes de la sección 3.4.
- [ ] Diagrama reacomodado para que la relación `alergia → paciente_alergia` no parezca llegar a otra tabla.

### 7.4 Diseño documental (`I1-05` Hospital, `I3-04` Laboratorio)

- Se mantiene la **misma jerarquía del núcleo**: paciente → consulta → diagnóstico → tratamiento, y consulta → receta → detalles.
- Se embebe lo que es pequeño, acotado y se lee siempre con el padre. Se referencia lo que crece sin límite.
- **Hospital:**
  - Embebidos en `pacientes`: datos demográficos, alergias y antecedentes críticos.
  - En una colección aparte indexada por `pacienteId`: `consultas` (con sus diagnósticos, tratamientos y recetas del episodio).
  - Si entra la v1.1: `citas`.
- **Laboratorio:**
  - Raíz: `pacientes`.
  - Subcolección: `ordenes`, con `resultados` como un mapa dinámico por tipo de examen. Se respeta el límite de 1 MB por documento.
- Cada decisión queda en `infra/database/<motor>/` y se resume en la Entrega I.

### 7.5 Fase 3: adaptadores (regla para los 4)

1. **Mapper obligatorio.** Nada de `_id`, `Timestamp`, `snake_case` ni `Date` sale del adaptador.
2. **Transacción real.** Crear una receta con sus detalles es atómico. Si falla un detalle, no queda una receta a medias. Esto se prueba en la suite de contrato forzando un error.
3. **`detallesInstitucion`** lleva las extensiones sin romper las consultas generales.
4. **Aislamiento.** Si el motor no responde, el adaptador lanza `MotorNoDisponible`, el `errorHandler` responde `503` solo para esa institución y el servidor sigue arriba.

### 7.6 Frontend (Fase 4)

- HTML, CSS y JavaScript Vanilla. **La misma interfaz para los 4 motores.** Lo único que cambia por institución es la sección de `detallesInstitucion`.
- La interfaz no sabe qué motor hay detrás. Solo el panel técnico muestra el motor, y lo toma de `/system/status`.
- Pantallas mínimas:
  - Login
  - Pacientes (buscar, registrar)
  - Historial consolidado
  - Nueva consulta (diagnóstico, tratamiento, receta)
  - Archivar
  - Panel técnico

---

## 8. Línea argumental del comparativo (`I#-12`)

Cada sección cubre lo mismo: **por qué este motor** (volumen, estructura, transacciones, operación), **modelado**, **consistencia** y **seguridad**. Todo debe tener respaldo en el repositorio.

- **Hospital · MongoDB Atlas (I1).**
  - Atlas corre como Replica Set y soporta transacciones ACID multi-documento con `withTransaction()`. Eso da la atomicidad que exige el acto clínico.
  - El expediente se lee en pocas consultas, sin cadenas de JOINs.
  - Preparar la respuesta a la pregunta segura de la defensa: "¿por qué no SQL si el Hospital pide integridad?". Hay que mostrar la prueba de rollback y el JSON Schema que valida la estructura.
- **Odontología · PostgreSQL en Supabase (I2).**
  - Es un servicio administrado: la clínica no tiene personal técnico y Supabase se encarga de respaldos, TLS y mantenimiento.
  - La integridad relacional controla servicios, piezas dentales, pólizas y recetas.
  - Seguridad con RLS y rol mínimo.
- **Laboratorio · Firestore (I3).**
  - Los resultados son polimórficos (hematología, orina, cultivo) y se guardan como mapas por tipo sin columnas `NULL`.
  - Las órdenes van en subcolecciones para no chocar con el límite de 1 MB.
  - La consistencia se logra con `runTransaction` y `writeBatch`.
  - Seguridad por IAM y cuenta de servicio, con reglas deny-all (ver la nota de la sección 4.5).
- **Pediatría · MariaDB local (I4).**
  - Los datos son tabulares y estandarizados: esquema de vacunación por dosis y edad, y controles de crecimiento.
  - Integridad referencial con FKs, de modo que no quedan vacunas ni controles huérfanos.
  - Transacciones InnoDB.
  - Al ser una red local, la latencia es baja. **Esto se muestra con las mediciones de `/system/status`**, no se afirma como "sub-milisegundo garantizada".
  - Seguridad con usuario y `GRANT` mínimos.

---

## 9. Qué hacer si alguien se atrasa

1. **P1 (no se recorta):**
   - El contrato (`I3-01`, `I3-02`, `I1-04`)
   - El enrutamiento (`I1-03`)
   - Las operaciones obligatorias en los 4 adaptadores
   - La seguridad mínima por motor
   - Las pantallas mínimas del frontend
   - El comparativo y el PDF
2. **P2 (se recorta si falta tiempo):**
   - Citas (contrato v1.1)
   - Edición de consultas con auditoría
   - Los módulos especiales de la S11 (se deja solo lo mínimo de `detallesInstitucion`)
   - Embellecer el panel técnico
3. **Regla de rescate:**
   - Si un adaptador no llega a la Convergencia 2, su dueño pide ayuda en la bitácora y en el canal del grupo.
   - Quien esté adelantado toma la parte 2 de ese adaptador, siempre bajo revisión del dueño.
   - Nunca se toca el contrato para "acomodar" un adaptador atrasado.
4. **Aislamiento:** si un motor en la nube falla la víspera de una revisión, el sistema responde `503` para esa institución y las otras 3 siguen funcionando. Eso también se demuestra en la exposición.

---

## 10. Skills y plugins para las IAs (Antigravity, Codex y Claude Code)

### 10.1 Cómo lee cada herramienta la configuración

Las tres herramientas usan el mismo formato de skill (`SKILL.md`, estándar *Agent Skills*). Por eso las skills se escriben **una sola vez** en `.agents/skills/`.

| Herramienta | Reglas del proyecto | Skills del proyecto | Plugins / herramientas externas |
|---|---|---|---|
| **Antigravity** | `AGENTS.md` en la raíz (desde la v1.20.5) y `.agents/rules/*.md` (máx. 12 000 caracteres por archivo) | `.agents/skills/<nombre>/SKILL.md` | Servidores MCP desde el *MCP Store* o la configuración MCP de Antigravity |
| **Codex** | `AGENTS.md` en la raíz | `.agents/skills/<nombre>/SKILL.md` (lo busca en la carpeta actual, las superiores y la raíz del repo) | Servidores MCP en `~/.codex/config.toml` (`[mcp_servers.<nombre>]`) |
| **Claude Code** | `.claude/CLAUDE.md` con la línea `@AGENTS.md` | `.claude/skills/<nombre>/SKILL.md` (copia generada) | Servidores MCP en `.mcp.json` y plugins en `.claude/settings.json` |

> **Por qué `.agents` (plural) y no `.agent`:** `.agents/` es la ruta actual de Antigravity para reglas y skills, y también es la que usa Codex. `.agent/` (singular) solo se mantiene por compatibilidad para reglas viejas de Antigravity y **no** carga skills.

**Sincronización para Claude Code.** `scripts/sync-skills.js` copia `.agents/skills/` a `.claude/skills/` (se corre con `npm run skills:sync`). No se usa symlink porque falla en Windows si Git no tiene `core.symlinks`. El CI compara ambas carpetas y falla si están desincronizadas.

### 10.2 Skills del proyecto

| Skill | Dueño | Se usa cuando… | Qué obliga a hacer |
|---|---|---|---|
| `crear-adaptador` | I1 | Se implementa o modifica un adaptador | Respetar el puerto, usar el mapper, transacciones nativas, `MotorNoDisponible` → 503, sin ORM |
| `verificar-contrato` | I3 | Se termina un método de adaptador o se toca Zod | Correr la suite `describe.each` y revisar la forma (camelCase, `id` string, fechas ISO) |
| `disenar-ddl-sql` | I2 | Se escribe DDL para PostgreSQL o MariaDB | Aplicar el checklist de 7.2/7.3, `CHECK`, FKs compuestas y tipos correctos por motor |
| `modelo-documental` | I1 + I3 | Se diseñan colecciones de Mongo o Firestore | Mantener la jerarquía del núcleo, decidir embebido o referencia, respetar el límite de 1 MB y documentar en `infra/database/` |
| `escribir-bitacora` | I4 | Termina una sesión de trabajo | Agregar la entrada con la plantilla de 2.1 en la bitácora del integrante |
| `revisar-pr` | I1 | Se revisa un PR | Recorrer el checklist 4.6 y reportar violaciones de DIP, LSP, YAGNI y DRY |

**Ejemplo completo** (`.agents/skills/crear-adaptador/SKILL.md`):

```markdown
---
name: crear-adaptador
description: Implementa o modifica un adaptador de base de datos (MongoDB, PostgreSQL, Firestore o MariaDB) del proyecto BD II cumpliendo el puerto HistorialRepository. Úsala siempre que se toque src/infrastructure/adapters/.
---

# Crear o modificar un adaptador

1. Lee `src/domain/ports/HistorialRepository.js` y `contratos/API.md`. No inventes métodos ni campos.
2. Trabaja solo dentro de `src/infrastructure/adapters/<motor>/`: `<Motor>Adapter.js`, `mapper.js` y `connection.js`.
3. Usa el driver oficial (`pg`, `mariadb`, `mongodb`, `firebase-admin`). Está prohibido usar Prisma, TypeORM, Sequelize o Mongoose.
4. Toda salida pasa por `mapper.toDomain()`: camelCase, `id` como string, fechas ISO-8601. Nunca sale `_id`, `Timestamp`, `Date` ni `snake_case`.
5. Las escrituras de varias partes (receta con sus detalles, consulta con su diagnóstico) son atómicas:
   - SQL: `BEGIN/COMMIT/ROLLBACK`
   - Mongo: `session.withTransaction()`
   - Firestore: `runTransaction` o `writeBatch`
6. No valides reglas de negocio aquí; eso vive en `src/application/`.
7. Si el motor no responde, lanza `MotorNoDisponible` (el `errorHandler` lo convierte en 503).
8. Al terminar, ejecuta la skill `verificar-contrato` y agrega la entrada de bitácora con `escribir-bitacora`.
```

**Ejemplo corto** (`.agents/skills/escribir-bitacora/SKILL.md`):

```markdown
---
name: escribir-bitacora
description: Agrega la entrada de bitácora de la sesión en docs/bitacoras/<ID>/bitacora.md. Úsala al cerrar cualquier tarea I#-XX o antes de abrir un PR.
---

1. Identifica la tarea (`I#-XX`) por el nombre de la rama o pregúntala.
2. Agrega al final de `docs/bitacoras/<ID>-<institucion>-<motor>/bitacora.md` la plantilla de la sección 2.1 de `docs/planificacion/PLANIFICACION.md`.
3. Llena "Qué hice" y "Evidencia" con los commits reales de la rama (`git log main..HEAD --oneline`). No inventes avances.
4. Si hubo una decisión que afecta a otros integrantes, sugiere crear un ADR en `docs/decisiones/`.
```

Reglas para escribir skills:
- El `name` va en minúsculas con guiones y **debe coincidir con el nombre de la carpeta**.
- La `description` dice qué hace la skill **y cuándo usarla**, porque es lo que la IA compara con lo que le piden.
- Cada skill hace una sola cosa. Las reglas generales van en `AGENTS.md`, no se repiten en cada skill (DRY).

### 10.3 Plugins y servidores MCP recomendados

| MCP / plugin | Para qué | Quién lo usa | Restricción obligatoria |
|---|---|---|---|
| **Context7** | Documentación actualizada de `pg`, `mariadb`, `mongodb`, `firebase-admin`, Express y Zod | Todos | — |
| **GitHub MCP** | Leer issues y PRs y revisar diffs desde la IA | Todos (sobre todo I1 en las convergencias) | Token con permisos solo sobre el repo |
| **MongoDB MCP Server** (oficial) | Explorar colecciones e índices del cluster de Atlas | I1 | **Modo solo lectura** y cluster de desarrollo con datos ficticios |
| **Supabase MCP** (oficial) | Revisar esquema, RLS y consultas | I2 | **Solo lectura** y limitado al proyecto del curso |
| **Firebase MCP** (`firebase-tools`) | Revisar colecciones, índices y reglas | I3 | Proyecto de desarrollo, nunca la llave de servicio en el repo |
| **MariaDB MCP** (oficial, o uno genérico de MySQL) | Inspeccionar el esquema local de Docker | I4 | Usuario de solo lectura (`GRANT SELECT`) |
| **Playwright MCP** | Probar el frontend (login, registrar paciente, archivar) | I2, I3, I4 en la Fase 4 | Solo contra `localhost` |

Reglas para todos los MCP:
1. **Ningún secreto en el repo.** `.mcp.json` y `.claude/settings.json` usan variables de entorno (`${SUPABASE_ACCESS_TOKEN}`). La config de Codex vive en `~/.codex/config.toml`, fuera del repo.
2. **Las IAs no escriben directo en las bases.** Los cambios de esquema pasan por `infra/database/<motor>/ddl/` y un PR. El MCP es para mirar, no para migrar.
3. **`.claude/settings.json` niega la lectura de `.env*`** con una regla `deny` de `Read(./.env*)`. En Codex y Antigravity, la misma regla va escrita en `AGENTS.md`.
4. Cada integrante instala solo los MCP de su motor más los comunes. Así se reduce el ruido y no se exponen credenciales de otro motor.
