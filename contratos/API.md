# Contrato HTTP · v1.0

> Responsable: I3 (tarea I3-02). La fuente de verdad son los esquemas Zod (`src/domain/entities/` y `src/interfaces/http/validators/`). Si no coinciden con este documento, manda Zod y se corrige aquí en el mismo PR. Un JSON real por endpoint vive en `contratos/ejemplos/`.

## Reglas de forma (Liskov Substitution Principle)

- `id` siempre `string` (nunca número ni ObjectId).
- Campos en camelCase (nunca `_id`, `snake_case` ni nombres de columna relacionales).
- Fechas ISO-8601: `fechaNacimiento` como `YYYY-MM-DD`, instantes como `YYYY-MM-DDTHH:mm:ss.sssZ` (nunca Date de JS ni Firestore Timestamp).
- Datos propios de cada institución en `detallesInstitucion`.
- Estado de archivo solo en `historial.estado` (`activo` | `archivado`), con `fechaArchivo` y `motivoArchivo: { tipo, detalle }` (`tipo`: `traslado` | `fallecimiento` | `administrativo` | `otro`).

## Catálogo de Rutas

| Método y ruta | Caso de uso | Ejemplo Request | Ejemplo Response |
|---|---|---|---|
| `POST /auth/login` | Autenticación y emisión del JWT con `institucion` y `rol` | [`auth-login-request.json`](./ejemplos/auth-login-request.json) | [`auth-login-response.json`](./ejemplos/auth-login-response.json) |
| `POST /pacientes` | Registro de paciente | [`paciente-crear-request.json`](./ejemplos/paciente-crear-request.json) | [`paciente-crear-response.json`](./ejemplos/paciente-crear-response.json) |
| `GET /pacientes` | Búsqueda y listado paginado | N/A (query params) | [`pacientes-listar-response.json`](./ejemplos/pacientes-listar-response.json) |
| `GET /pacientes/:id` | Detalle del paciente | N/A | [`paciente-crear-response.json`](./ejemplos/paciente-crear-response.json) |
| `GET /pacientes/:id/historial` | Historial consolidado | N/A | [`historial-response.json`](./ejemplos/historial-response.json) |
| `PATCH /pacientes/:id/archivar` | Archivado formal con motivo | [`archivar-request.json`](./ejemplos/archivar-request.json) | [`archivar-response.json`](./ejemplos/archivar-response.json) |
| `POST /laboratorio/ordenes` | Registrar orden de laboratorio | [`orden-laboratorio-request.json`](./ejemplos/orden-laboratorio-request.json) | [`orden-laboratorio-response.json`](./ejemplos/orden-laboratorio-response.json) |
| `POST /laboratorio/muestras` | Registrar muestra con código de barras | [`muestra-laboratorio-request.json`](./ejemplos/muestra-laboratorio-request.json) | [`muestra-laboratorio-response.json`](./ejemplos/muestra-laboratorio-response.json) |
| `POST /laboratorio/resultados` | Registrar resultado con polimorfismo | [`resultado-laboratorio-request.json`](./ejemplos/resultado-laboratorio-request.json) | [`resultado-laboratorio-response.json`](./ejemplos/resultado-laboratorio-response.json) |
| `GET /system/status` | Estado de motores y latencia | N/A | [`system-status-response.json`](./ejemplos/system-status-response.json) |

## Formato de error único

Todas las respuestas con código de error (4xx y 5xx) respetan esta estructura exacta:

```json
{
  "error": {
    "codigo": "PACIENTE_DUPLICADO",
    "mensaje": "Ya existe un paciente con documento de identidad 2987654320101"
  }
}
```

| Código HTTP | Código interno (`error.codigo`) | Cuándo se usa |
|---|---|---|
| `400` | `VALIDACION`, `JSON_INVALIDO` | Parámetros o formato incorrecto |
| `401` | `NO_AUTENTICADO` | Sin token JWT o credenciales inválidas |
| `403` | `PROHIBIDO`, `INSTITUCION_INVALIDA` | Token no autorizado para la operación |
| `404` | `NO_ENCONTRADO`, `PACIENTE_NO_ENCONTRADO` | Registro no existe en el repositorio |
| `409` | `CONFLICTO`, `PACIENTE_DUPLICADO` | Conflicto de unicidad o estado del paciente |
| `503` | `MOTOR_NO_DISPONIBLE` | El motor de base de datos de esa institución no responde |

## Detalle por Endpoint

### 1. `POST /auth/login`
Autentica usuarios por institución y emite el JWT institucional.
- **Headers:** `Content-Type: application/json`
- **Body:** `{ "institucion": "laboratorio", "usuario": "laboratorista", "password": "password123" }`
- **Respuesta 200:** `{ "token": "<JWT firmado>" }`

### 2. `POST /pacientes`
Crea un nuevo paciente. Valida unicidad de `documentoIdentidad`.
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Respuesta 201:** Objeto Paciente con su `id` asignado y fechas de auditoría.

### 3. `GET /pacientes`
Lista pacientes de la institución del token con filtros opcionales.
- **Query params:** `documento`, `estado` (`activo`|`archivado`), `texto`, `pagina`, `limite`.
- **Respuesta 200:** `{ "items": [...], "total": 1 }`

### 4. `GET /pacientes/:id/historial`
Obtiene el expediente consolidado con su estado de archivo y consultas.
- **Respuesta 200:** `{ "paciente": {...}, "estado": "activo"|"archivado", "consultas": [...] }`

### 5. `PATCH /pacientes/:id/archivar`
Archiva el expediente del paciente indicando justificación formal.
- **Body:** `{ "motivo": "Traslado voluntario a otra institución de salud" }`
- **Respuesta 200:** Historial actualizado con `estado: "archivado"` y `fechaArchivo`.
