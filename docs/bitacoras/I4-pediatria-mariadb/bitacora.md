# Bitácora · I4 · Centro Pediátrico · MariaDB local (Docker)

<!-- Agrega una entrada por sesión, en el mismo PR de la tarea. -->

## Sesión N · AAAA-MM-DD · Tarea I4-XX

- **Objetivo de la sesión:** …
- **Qué hice:** …
- **Decisiones tomadas (y por qué):** …
- **Problemas / bloqueos:** …
- **Evidencia:** PR #…, commit …
- **Tiempo invertido:** … min
- **Siguiente paso:** …

## Sesión 1 · 2026-10-29 · Tarea I4-03

- **Objetivo de la sesión:** Login general único en `frontend/index.html` que envía a cada usuario al portal de su institución, y base visual común para los 4 frontends.
- **Qué hice:**
  - `frontend/index.html`: login a pantalla completa. Panel gráfico a la izquierda (ruleta de ilustraciones SVG que gira y cambia de tono por institución, burbujas que suben despacio) separado por una onda del formulario a la derecha.
  - `frontend/shared/js/api/auth.js`: `login`, `obtenerSesion` (lee `institucion` y `rol` del JWT), `cerrarSesion`, `rutaInstitucion` y `exigirSesion`.
  - `frontend/shared/css/fuentes.css`: fuente única Schibsted Grotesk para todo el proyecto.
  - `frontend/pediatria/index.html`: entrada del portal protegida con `exigirSesion('pediatria')`. `frontend/hospital/index.html` protegido con `exigirSesion('hospital')` y con la fuente nueva.
  - `mockups/README.md`: secciones de tipografía y tonos por institución. Plan (3.4, S3, 7.1, 7.6) y `contratos/API.md` alineados con el login general.
- **Decisiones tomadas (y por qué):**
  - El formulario pide la institución: el plan autentica contra la base de cada institución y así, si un motor cae, solo falla ese login.
  - El destino lo decide el JWT, no el formulario (regla de seguridad del plan).
  - Sin emojis en la interfaz; íconos en SVG.
- **Problemas / bloqueos:** `POST /auth/login` aún no existe (I1-03). Hasta entonces el formulario muestra el error y la redirección se prueba simulando el token en `sessionStorage`. La forma `{ token }` de la respuesta queda en `contratos/API.md` y debe confirmarla I3/I1 en el ADR de login.
- **Pendiente para el equipo:** I2 (`frontend/odontologia/`) e I3 (`frontend/laboratorio/`) deben crear su `index.html` con `exigirSesion('<institucion>')` y enlazar `../shared/css/fuentes.css`. Ningún portal tiene login propio.
- **Evidencia:** rama `feat/I4-03-login-general`, PR a `main`.
- **Tiempo invertido:** 90 min
- **Siguiente paso:** I4-04 ER y relacional corregido de Pediatría.
