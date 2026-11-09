# Bitácora · I3 · Laboratorio Clínico · Firebase Firestore

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión 1 · 2026-10-30 · Tarea I3-10

- **Objetivo de la sesión:** Implementar el portal frontend modular del Laboratorio Clínico (`frontend/laboratorio/`) desacoplado de la API con datos semilla interactivos.
- **Qué hice:**
  - Estructuré `frontend/laboratorio/` con `index.html`, `css/laboratorio.css` (paleta púrpura institucional) y vistas dinámicas en `vistas/` (`principal.html`, `expedientes.html`, `pacientes.html`, `examenes.html`).
  - Desarrollé el almacén de datos mock y persistencia local (`datos.js`) con catálogo de tipos de examen (hematología, química, orina, heces, inmunología, microbiología) y generador de órdenes (`generarIdOrden`).
  - Implementé el router por hash (`app.js`), modales de nueva orden y registro de paciente, filtrado reactivo de expedientes y estados de muestra (pendiente, en proceso, completado, cancelado).
  - Integré `fetchPlantillaHtml` de `frontend/shared/js/api/client.js` y el protector de sesión `exigirSesion('laboratorio')` de `auth.js`.
- **Decisiones tomadas (y por qué):**
  - Cargar las sub-vistas HTML mediante `fetchPlantillaHtml` para cumplir estrictamente con las reglas de ESLint de `AGENTS.md`.
  - Proteger el acceso al portal mediante `exigirSesion('laboratorio')` para respetar la gobernanza de autenticación del proyecto.
- **Problemas / bloqueos:** Ajustes en ESLint (uso restringido de fetch, bloque try/catch vacío y función no invocada resuelta al conectarse al botón principal).
- **Evidencia:** Commits en rama `andres`, PR #5.
- **Tiempo invertido:** 120 min
- **Siguiente paso:** I3-04 Diseño documental de Firestore (colecciones `pacientes` y subcolecciones `ordenes`).

## Sesión 2 · 2026-10-31 · Tarea I3-10

- **Objetivo de la sesión:** Sincronizar la rama `andres` con `origin/main` y asegurar que los ajustes de ESLint (`fetchPlantillaHtml`, `wireTopAction`, bloque `catch`), control de sesión (`exigirSesion`) y bitácora queden integrados sin conflictos.
- **Qué hice:**
  - Sincronicé la rama con `origin/main` resolviendo los conflictos en `frontend/laboratorio/index.html`, `frontend/laboratorio/js/app.js` y `frontend/laboratorio/js/datos.js`.
  - Verifiqué el uso de `fetchPlantillaHtml` desde `../../shared/js/api/client.js`, la invocación de `wireTopAction()` en el arranque, el comentario en el `catch` de `reiniciarDemo()` y la llamada a `exigirSesion('laboratorio')`.
- **Decisiones tomadas (y por qué):**
  - Mantener la versión alineada con las reglas del CI en `origin/main` para evitar regresiones de lint o conflictos de fusión.
- **Problemas / bloqueos:** La rama local tenía un commit anterior al squash merge de `main`, lo que generaba conflictos y errores de lint en el PR.
- **Evidencia:** Merge de `origin/main` en `andres` (`f9d5961`, `533bad7`).
- **Tiempo invertido:** 15 min
- **Siguiente paso:** I3-04 Diseño documental de Firestore (colecciones `pacientes` y subcolecciones `ordenes`).

## Sesión 3 · 2026-11-04 · Tareas I3-04, I3-05, I3-06

- **Objetivo de la sesión:** Implementar los requerimientos de `QueQuiero copy.md`: infraestructura de Firebase, separación modular frontend/backend, soporte completo para los 8 laboratorios con campos polimórficos, las 10 reglas de negocio y preservación de la estructura estándar de paciente (Regla 8).
- **Qué hice:**
  - Configuré la base de conexión de Firebase en `src/infrastructure/config/firebase.js` y actualicé `.env.example` con instrucciones y variables exactas para la API Key (`FIREBASE_API_KEY`) y la Service Account (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` / `FIREBASE_SERVICE_ACCOUNT_PATH`).
  - Creé `infra/database/firestore/estructura.md` documentando la arquitectura de colecciones (`pacientes`, `ordenes`, `muestras`, `resultados`), guía paso a paso para la API Key y reglas `deny-all` en `firestore.rules`, e índices en `firestore.indexes.json`.
  - Definí las entidades de dominio con Zod en `src/domain/entities/paciente.js` (respetando los datos de los demás módulos sin reemplazarlos por los propuestos, cumpliendo la Regla 8) y `src/domain/entities/laboratorio.js` (los 8 laboratorios, órdenes, muestras, resultados, antibiograma y auditoría).
  - Codifiqué el puerto formal `src/domain/ports/HistorialRepository.js` y las 10 reglas clínicas en `src/domain/rules/reglasLaboratorio.js`.
  - Implementé `FirestoreAdapter.js` (con manejo de `MotorNoDisponible`), `mapper.js` (LSP compliant) y `laboratorioFirestoreRepository.js`.
  - Refactoricé y separé el frontend de `frontend/laboratorio/js/` reduciendo drásticamente el tamaño de `app.js` en módulos especializados: `catalogo.js`, `reglas.js`, `datos.js`, `ui/modal.js`, `ui/tablas.js`, `ui/formularios.js` y `ui/vistas.js`.
  - Desarrollé una suite exhaustiva de pruebas unitarias (`tests/unit/pacienteLaboratorio.test.js`, `tests/unit/reglasLaboratorio.test.js`, `tests/unit/firestoreMapper.test.js`, `tests/unit/firestoreAdapter.test.js`).
- **Decisiones tomadas (y por qué):**
  - Aplicar estrictamente la Regla 8 de la especificación: mantener los atributos de `Paciente` consistentes con el núcleo (`id`, `documentoIdentidad`/`cui`, `nombre`, `apellidos`, `fechaNacimiento`, `genero`, etc.) y ubicar los campos específicos en `detallesInstitucion`.
  - Modularizar la interfaz de usuario en archivos pequeños desacoplados para cumplir la solicitud de legibilidad y mantenibilidad.
- **Problemas / bloqueos:** Ninguno; todas las pruebas de Vitest (25/25) y verificaciones de ESLint pasan en verde.
- **Evidencia:** Archivos creados en `src/`, `infra/database/firestore/`, `frontend/laboratorio/js/` y `tests/unit/`.
- **Tiempo invertido:** 90 min
- **Siguiente paso:** I3-02 Documentación en `contratos/API.md` con ejemplos JSON.


## Sesión 4 · 2026-11-05 · Tareas I3-03, I3-09, I3-10

- **Objetivo de la sesión:** Conectar el módulo de Laboratorio Clínico con Firebase Firestore en la API Express y desacoplar el frontend de `localStorage` para sincronizarse con la base de datos real.
- **Qué hice:**
  - Creé `src/infrastructure/config/RepositoryFactory.js` implementando el patrón Factory/Strategy para resolver `FirestoreAdapter` y `LaboratorioFirestoreRepository` para la institución `laboratorio`.
  - Implementé la ruta de autenticación de laboratorio `src/interfaces/http/routes/laboratorioAuth.js` (`POST /auth/login`) con emisión de JWT para laboratorista/técnico/validador.
  - Implementé `src/interfaces/http/routes/laboratorioRoutes.js` exponiendo los endpoints del núcleo (`/pacientes`, `/pacientes/:id`, `/pacientes/:id/historial`, `/pacientes/:id/archivar`) y los especializados de laboratorio (`/laboratorio/ordenes`, `/laboratorio/muestras`, `/laboratorio/resultados`, `/laboratorio/status`).
  - Desarrollé el script de seeding `scripts/seed-firestore.js` y agregué el comando `npm run seed:laboratorio`, poblando con éxito las colecciones `pacientes`, `ordenes`, `muestras` y `resultados` en Firestore real.
  - Eliminé `frontend/laboratorio/js/firestore.js` para respetar la regla arquitectónica de que el navegador jamás habla directo con una base de datos.
  - Refactoricé `frontend/laboratorio/js/datos.js` y vistas para consultar en vivo la API Express mediante `apiClient` e incorporar actualización en tiempo real con fallback resiliente.
  - Creé la suite de pruebas de integración `tests/integration/laboratorioRoutes.test.js` (9 pruebas pasando).
- **Decisiones tomadas (y por qué):**
  - Respetar la arquitectura hexagonal y la regla 7 de `AGENTS.md` ("El navegador nunca se conecta a una base"): todo el tráfico pasa por Express con `apiClient`.
  - Asegurar `serviceAccountKey*.json` en `.gitignore` para salvaguardar credenciales privadas.
- **Problemas / bloqueos:** Error inicial con la importación modular de `firebase-admin` en Node v22 resuelto migrando a las funciones oficiales `getApps`, `initializeApp`, `cert` y `getFirestore`.
- **Evidencia:** 68/68 pruebas unitarias e integración en verde con Vitest y 0 errores en ESLint.
- **Tiempo invertido:** 45 min
- **Siguiente paso:** I3-02 Documentación en `contratos/API.md` con ejemplos JSON.


## Sesión 5 · 2026-11-05 · Tareas I3-02, I3-08, I3-09

- **Objetivo de la sesión:** Implementar la suite de pruebas de contrato formal (`tests/contract/contrato.test.js`), actualizar el contrato HTTP `contratos/API.md` v1.0 con sus ejemplos JSON validados por Zod, y certificar el aislamiento institucional y seguridad deny-all de Firestore.
- **Qué hice:**
  - Implementé `src/infrastructure/adapters/mock/MockAdapter.js` como base de pruebas en memoria para la suite de equivalencia.
  - Creé la suite de pruebas de contrato `tests/contract/contrato.test.js` (`describe.each`) ejecutando las 18 pruebas contra `MockAdapter` y `FirestoreAdapter` (LSP compliant).
  - Actualicé `contratos/API.md` a la versión 1.0 documentando todas las rutas, parámetros y formatos de error único.
  - Creé los archivos JSON de ejemplo en `contratos/ejemplos/` y la suite automatizada `tests/unit/contratosEjemplos.test.js` para asegurar que cada ejemplo valide contra sus esquemas Zod de dominio.
  - Implementé `tests/integration/aislamientoLaboratorio.test.js` validando aislamiento por `RepositoryFactory`, tagging obligatorio de `institucionId = I3` y aislamiento de 503 ante caídas de motor.
- **Decisiones tomadas (y por qué):**
  - Mantener `firestore.rules` con directiva estricta deny-all para forzar que el 100% de operaciones provengan del backend con el Admin SDK.
  - Integrar `MockAdapter` y `FirestoreAdapter` en la suite de contrato común para asegurar que no existan discrepancias de tipos o nombres entre motores.
- **Problemas / bloqueos:** Ninguno; las 97 pruebas pasaron en verde.
- **Evidencia:** 97/97 pruebas pasando en Vitest (`npm test`), 0 errores de ESLint (`npm run lint`), `contratos/API.md` v1.0 completo.
- **Tiempo invertido:** 40 min
- **Siguiente paso:** I3-11 Refinamiento visual y tablas de resultados por tipo en el frontend.


## Sesión 6 · 2026-11-07 · Tarea I3-11

- **Objetivo de la sesión:** Refinar los visualizadores clínicos y controladores del frontend para las 8 especialidades de Laboratorio Clínico (I3-11), armonizando los selectores DOM y la presentación de resultados.
- **Qué hice:**
  - Diseñé e implementé `frontend/laboratorio/js/ui/visualizadores.js` con componentes clínicos especializados para los 8 tipos de laboratorio:
    1. Hematología: hemograma completo, eritrocitos, plaquetas y fórmula leucocitaria diferencial apilada.
    2. Química Clínica: rango de referencia visual interactivo con indicador posicional y badge de anormalidad.
    3. Urianálisis: examen físico-químico en tiras y sedimento microscópico (40X).
    4. Inmunología/Serología: banner de reactividad (REACTIVO / NO REACTIVO), punto de corte (cut-off) y técnica.
    5. Microbiología: cultivo bacteriológico, tinción Gram y tabla de antibiograma con CMI (µg/mL) y badges de sensibilidad.
    6. Coagulación: panel hemostático con tarjeta destacada de INR, TP, TTPa, fibrinógeno y dímero D.
    7. Banco de Sangre: carnet de Grupo ABO y Factor Rh en grande, Coombs directo/indirecto y compatibilidad cruzada.
    8. Biología Molecular: amplificación por RT-PCR, detección cualitativa, carga viral y límite analítico.
  - Conecté `renderResultadosEspecializados` en `frontend/laboratorio/js/ui/formularios.js` en el modal de detalle del estudio (`detalleExamen`).
  - Armonicé `frontend/laboratorio/js/ui/vistas.js` alineando los selectores DOM reales con los IDs de las vistas HTML (`#inicio-kpi-container`, `#inicio-pendientes-container`, `#table-container`, `#laboratorio-table-container`, chips de filtrado y botones de registro rápido).
  - Añadí todos los estilos correspondientes en `frontend/laboratorio/css/laboratorio.css` asegurando consistencia visual y responsiva.
- **Decisiones tomadas (y por qué):**
  - Mantener los visualizadores desacoplados en `visualizadores.js` sin alterar el esquema ni romper la equivalencia del puerto `HistorialRepository` (LSP).
  - Conservar el acceso por API desacoplada cumpliendo estrictamente con la Regla 7 (el navegador jamás accede directamente a Firestore).
- **Problemas / bloqueos:** Desfase inicial en selectores de IDs de plantillas HTML resuelto satisfactoriamente.
- **Evidencia:** 97/97 pruebas pasando en Vitest (`npm test`), 0 errores en ESLint (`npm run lint`), visualizadores probados y validados.
- **Tiempo invertido:** 40 min
- **Siguiente paso:** Revisión final y aprobación del PR #23 para la entrega de la Convergencia 1.


