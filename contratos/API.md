# Contrato HTTP · v0.9 (borrador)

> Responsable: I3 (tarea I3-02). La fuente de verdad son los esquemas Zod (`src/domain/entities/` y `src/interfaces/http/validators/`). Si no coinciden con este documento, manda Zod y se corrige aquí en el mismo PR. Un JSON real por endpoint vive en `contratos/ejemplos/`.

## Reglas de forma

- `id` siempre `string`.
- Campos en camelCase.
- Fechas ISO-8601: `fechaNacimiento` como `YYYY-MM-DD`, instantes como `YYYY-MM-DDTHH:mm:ss.sssZ`.
- Datos propios de cada institución en `detallesInstitucion`.
- Estado de archivo solo en `historial.estado` (`activo` | `archivado`), con `fechaArchivo` y `motivoArchivo: { tipo, detalle }` (`tipo`: `traslado` | `fallecimiento` | `administrativo` | `otro`).

## Rutas

| Método y ruta | Caso de uso |
|---|---|
| `POST /auth/login` | Autenticación y emisión del JWT con `institucion` y `rol` |
| `POST /pacientes` · `GET /pacientes` · `GET /pacientes/:id` | Registro, búsqueda y detalle |
| `GET /pacientes/:id/historial` | Historial consolidado |
| `PATCH /pacientes/:id/archivar` | Archivado con motivo |
| `POST /consultas` | Nueva consulta (`pacienteId`, `citaId` opcional) |
| `POST /consultas/:id/diagnosticos` | Agregar diagnóstico |
| `POST /diagnosticos/:id/tratamientos` | Registrar tratamiento |
| `POST /consultas/:id/recetas` | Receta con detalle de medicamentos |
| `GET /system/status` | Estado de los motores (sin secretos ni datos clínicos) |

## Login

`POST /auth/login` (lo usa el login general `frontend/index.html`):

```json
// Petición
{ "institucion": "pediatria", "usuario": "dra.perez", "password": "…" }
// Respuesta 200
{ "token": "<JWT con { institucion, rol, exp }>" }
```

`institucion` es `hospital` | `odontologia` | `laboratorio` | `pediatria`. Credenciales inválidas → `401`; motor de esa institución caído → `503`. El frontend toma la institución de destino del JWT, no del formulario.

## Formato de error único

```json
{ "error": { "codigo": "PACIENTE_ARCHIVADO", "mensaje": "…" } }
```

| Código HTTP | Cuándo |
|---|---|
| `400` | Validación fallida |
| `401` / `403` | Sin token o sin permiso |
| `404` | Recurso inexistente |
| `409` | Paciente archivado o duplicado |
| `503` | El motor de esa institución está caído |

## Detalle por endpoint

<!-- Pendiente (I3-02): request, response y ejemplos de cada ruta. -->
