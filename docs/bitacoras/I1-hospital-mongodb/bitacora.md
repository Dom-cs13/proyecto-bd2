# Bitácora · I1 · Hospital General · MongoDB Atlas

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión 1 · 2026-10-26 · Tarea I1-01 + [PLAN]

- **Objetivo de la sesión:** frontend por institución, consulta en red y piezas base de I1-01.
- **Qué hice:** plan (secciones 2, 3.5, 6 y 7.6), AGENTS.md y reglas al día; `frontend/shared/` + una carpeta por institución; `package.json`, ESLint con DIP, Express base con `errorHandler`, prueba con Supertest y CI que revisa todo PR.
- **Decisiones tomadas (y por qué):** escritura local y lectura en red solo por `/red/...` (ADR pendiente en I1-03); `documentoIdentidad` como llave común; los 4 drivers en `package.json` desde ya para evitar conflictos en el lockfile.
- **Problemas / bloqueos:** soy el único code owner; la revisión obligatoria la hace el CI.
- **Evidencia:** rama `docs/PLAN-frontend-por-institucion-y-consulta-en-red`.
- **Tiempo invertido:** 60 min
- **Siguiente paso:** I1-03 (JWT, `RepositoryFactory` con `obtenerTodos`, ADR).

## Sesión 2 · 2026-10-27 · Frontend Hospital General (I1)

- **Objetivo de la sesión:** Implementar el frontend específico de Hospital General (`frontend/hospital/`) alineado a la nueva estructura por institución y reglas del proyecto.
- **Qué hice:**
  - Diseñé el sistema de variables CSS (`variables.css`, `layout.css`, `components.css`) basado en el mockup Alba Suite (tonos Teal/Dark Cyan, cards limpias, badges cyan).
  - Creé el contenedor principal en `frontend/hospital/index.html` con sidebar fijo, header de acciones, buscador predictivo, tabla clínica de pacientes y selector global en `frontend/index.html`.
  - Implementé el panel flotante / drawer lateral para visualización de historial clínico 360°, registro de nuevos pacientes con póliza de seguro y archivado legal justificado.
  - Añadí el módulo de laboratorio clínico (`laboratorio.html` y `laboratorioTable.js`) con visualización de parámetros y valores biométricos.
  - Centralicé el fetch helper en `frontend/shared/js/api/client.js` para estricto cumplimiento de ESLint y DIP.
- **Decisiones tomadas (y por qué):**
  - Aislar el frontend del Hospital en `frontend/hospital/` de acuerdo con la actualización del plan de la sección 7.6 para garantizar cero colisiones con I2, I3 e I4.
  - Mantener las operaciones reactivas en memoria mediante `state.js` para operar de forma desacoplada antes de la integración con el backend.
- **Problemas / bloqueos:** Ninguno. Tests y ESLint pasando en verde.
- **Evidencia:** Rama `hopital_general`, commits de frontend hospitalario y CI en verde.
- **Tiempo invertido:** 75 min
- **Siguiente paso:** Integración de la suite de contrato y conexión con `MongoAdapter`.

## Sesión 3 · 2026-10-30 · CI y Diagnóstico Automático con Auto-merge Autónomo (I1-01)

- **Objetivo de la sesión:** Implementar automensajes de diagnóstico en los Pull Requests y auto-merge 100% autónomo una vez superadas todas las pruebas del CI.
- **Qué hice:**
  - Diseñé el script `scripts/notificar-pr.js` que evalúa título reglamentario, conflictos con `main`, bitácora de sesión, credenciales, secretos (Gitleaks) y calidad de código (ESLint y tests).
  - Configuré el job `diagnostico` en `.github/workflows/ci.yml` para ejecutarse en eventos `pull_request` con permisos de escritura y auto-merge vía squash commit con eliminación automática de la rama remota al fusionar.
  - El sistema detecta y comenta de forma automática en el PR con un checklist detallado de los problemas encontrados y, al pasar todas las verificaciones, ejecuta la fusión a `main` y eliminación de la rama remota de manera 100% autónoma.
- **Decisiones tomadas (y por qué):**
  - Mantener un marcador único `<!-- CI-DIAGNOSTICO -->` para actualizar el comentario en lugar de generar spam en el historial del PR con cada commit.
  - Habilitar auto-merge autónomo para acelerar la integración continua sin requerir aprobaciones manuales repetitivas.
  - Migrar la detección de colisiones de `git merge-tree` a `--write-tree` para evitar falsos positivos por coincidencia de subcadenas ("conflictos" en textos de commit o bitácora).
  - Incluir llamada a `DELETE /git/refs/heads/<branch>` en la API REST de GitHub para asegurar la eliminación limpia de las ramas remotas fusionadas y configurar `fetch.prune = true`.
- **Problemas / bloqueos:** Falso positivo en el filtro de colisiones de git resuelto mediante `--write-tree`.
- **Evidencia:** `scripts/notificar-pr.js`, `.github/workflows/ci.yml`.
- **Tiempo invertido:** 70 min
- **Siguiente paso:** I1-03 (JWT, `RepositoryFactory`).


## Sesión 4 · 2026-11-05 · Implementación MongoDB Atlas y Compass (I1-04)

- **Objetivo de la sesión:** Implementar el modelo documental del Hospital General, configurar conexión a MongoDB Atlas mediante MongoDB Compass, crear el adaptador `MongoAdapter`, `mapper.js`, esquemas JSON y semillas de datos.
- **Qué hice:**
  - Diseñé el modelo documental a partir del diagrama ER del Hospital General (pág. 3): colecciones `pacientes` y `consultas` con pólizas, diagnósticos y tratamientos embebidos.
  - Creé las semillas JSON en `infra/database/mongodb/seeds/` (`pacientes.json` y `consultas.json`) listas para importar desde MongoDB Compass.
  - Implementé `src/infrastructure/adapters/mongodb/connection.js` con resolución DNS optimizada para clusters de Atlas, y `MongoAdapter.js` con las operaciones del puerto `HistorialRepository`.
  - Diseñé el `mapper.js` para asegurar cumplimiento estricto de LSP (id como string, camelCase, ISO dates).
  - Creé los esquemas JSON de validación en `infra/database/mongodb/colecciones/` y la definición de índices en `infra/database/mongodb/indices/`.
  - Añadí pruebas unitarias para el mapper en `tests/unit/mongoMapper.test.js`.
- **Decisiones tomadas (y por qué):**
  - Embeber la póliza de seguro y aseguradora en `pacientes` al ser leídas conjuntamente en admisiones.
  - Embeber la cadena clínica (diagnóstico, tratamiento, receta) dentro de cada documento de `consultas` para evitar JOINs y mantener atomicidad por episodio médico.
- **Problemas / bloqueos:** Ninguno. Conexión a MongoDB Atlas verificada con latencia en vivo y pruebas en verde.
- **Evidencia:** `src/infrastructure/adapters/mongodb/`, `infra/database/mongodb/`, `tests/unit/mongoMapper.test.js`.
- **Tiempo invertido:** 75 min
- **Siguiente paso:** Integración con rutas de Express y `RepositoryFactory`.

## Sesión 5 · 2026-11-05 · Restricciones de Validación y Módulo de Pólizas (I1-04)

- **Objetivo de la sesión:** Implementar restricciones estrictas en el formulario de alta de pacientes (género biológico Femenino/Masculino, DPI de 13 dígitos y teléfono de 8 dígitos) y desarrollar el módulo completo de gestión y asociación de pólizas de seguro (ER Hospital General) tanto en frontend como en base de datos MongoDB Atlas.
- **Qué hice:**
  - En `frontend/hospital/pages/gestion-pacientes.html` y `app.js`: eliminada la opción "Otro" dejando únicamente "Femenino" y "Masculino"; añadida validación y sanitización en tiempo real para limitar el DPI / CUI a exactamente 13 dígitos numéricos enteros y el teléfono a 8 dígitos numéricos.
  - En `frontend/hospital/js/components/modalDrawer.js`: aplicada restricción de 8 dígitos numéricos en la edición del teléfono del paciente.
  - En `frontend/hospital/js/components/sidebar.js`: incorporada la opción de navegación "🛡️ Pólizas de Seguro" con badge dinámico de conteo en tiempo real.
  - Diseñada la vista `frontend/hospital/pages/polizas.html` y su componente `frontend/hospital/js/components/polizasComponent.js` con formulario de emisión de pólizas (cobertura, porcentaje, vigencia, empresa aseguradora, NIT y teléfono de 8 dígitos), panel de asociación directa a pacientes activos y tabla/catálogo con búsqueda interactiva.
  - Actualizado el gestor de estado `frontend/hospital/js/state.js` con las colecciones `polizas`, métodos de creación y vinculación (`asociarPolizaAPaciente`), y cálculo automático de KPIs.
  - Actualizada la base de datos documental (`infra/database/mongodb/`): creado `colecciones/polizas.schema.json`, semillas `seeds/polizas.json` con 5 pólizas para Compass, índices `indices.json`, y adaptado `MongoAdapter.js` y `mapper.js` con operaciones `crearPoliza`, `listarPolizas` y `asociarPolizaPaciente`.
  - Añadida prueba unitaria en `tests/unit/mongoMapper.test.js` para `polizaToDomain` verificando cumplimiento LSP.
  - Implementado el sistema integral de ventanas flotantes modales personalizadas (`modalDialog.js`) y notificaciones toast con el diseño visual de Alba Suite (Hospital General), reemplazando el 100% de los `alert()`, `prompt()` y `confirm()` nativos del navegador por modales clínicos con backdrop difuminado, selección de motivos, tarjetas explicativas y transiciones fluidas.
  - Conectada la arquitectura completa de persistencia web a base de datos real: implementado `RepositoryFactory.js` (`obtenerRepositorio` + `obtenerTodos`), middleware `auth.js` (JWT) y `resolverRepositorio.js`, rutas Express en `src/interfaces/http/routes/` (`auth.js`, `pacientes.js` y `polizas.js`), y enlazado el cliente HTTP `apiClient` con `state.js` para que cada alta, archivado y póliza creada en el navegador se guarde en MongoDB Atlas en vivo y se refleje al instante en MongoDB Compass.
- **Decisiones tomadas (y por qué):**
  - Implementar un patrón híbrido para pólizas: persistencia en colección propia `polizas` para gestión de convenios y aseguradoras, combinada con embebido en `pacientes.polizaSeguro` para consultas de admisión en O(1).
  - Sanitizar entradas numéricas directamente en el evento `input` (`replace(/\D/g, '')`) para evitar que el usuario ingrese letras, caracteres especiales o longitudes mayores a las permitidas por la regulación guatemalteca (13 para DPI, 8 para teléfono).
  - Desacoplar los diálogos modales en `modalDialog.js` para garantizar consistencia visual UI/UX clínica en todas las vistas (archivado justificado, órdenes de laboratorio, validaciones y altas).
  - Conectar el frontend a los endpoints REST de Express con fallback resiliente offline, permitiendo que las inserciones persistan en MongoDB Atlas en tiempo real.
- **Problemas / bloqueos:** Ninguno. Validaciones de ESLint y pruebas unitarias de Vitest en verde.
- **Evidencia:** `src/infrastructure/config/RepositoryFactory.js`, `src/interfaces/http/routes/pacientes.js`, `src/interfaces/http/routes/polizas.js`, `src/interfaces/http/routes/auth.js`, `frontend/hospital/js/components/modalDialog.js`, `tests/integration/app.test.js`.
- **Tiempo invertido:** 85 min
- **Siguiente paso:** Pruebas e2e de navegación y commit a la rama.
