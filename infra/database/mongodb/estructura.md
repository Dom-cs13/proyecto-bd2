# Modelo Documental · MongoDB (Hospital General · I1)

> Documentación de arquitectura de datos para MongoDB Atlas y MongoDB Compass.
> Basado en el modelo conceptual del Hospital General (Fase I).

---

## 1. Decisiones de Embebido vs. Referenciado

| Entidad Relacional | Estrategia en MongoDB | Justificación |
|---|---|---|
| **Paciente** | Colección raíz `pacientes` | Entidad primaria de búsqueda y control clínico. |
| **Póliza & Aseguradora** | **Embebido** en `pacientes.polizaSeguro` y **Colección catálogo** `polizas` | Patrón híbrido: Embebido en paciente para lectura rápida en admisiones, y colección propia para gestión centralizada de aseguradoras y emisión. |
| **Detalles Hospitalarios** | **Embebido** en `pacientes.detallesInstitucion` | Cama, pabellón, tipo de sangre y antecedentes críticos (específicos de I1). |
| **Consultas** | Colección separada `consultas` | Crecimiento no acotado a lo largo de los años. Indexada por `pacienteId`. |
| **Diagnóstico** | **Embebido** en `consultas.diagnostico` | Relación 1:1 atómica dentro del episodio médico. |
| **Tratamiento** | **Embebido** en `consultas.diagnostico.tratamiento` | El tratamiento depende directamente del diagnóstico clínico asignado. |
| **Receta & Medicamentos**| **Embebido** en `tratamiento.receta.detalles[]` | La prescripción y desglose de fármacos (dosis, cantidad, frecuencia) pertenecen al episodio. |
| **Servicios** | **Embebido** en `consultas.servicios[]` | Snapshot del catálogo de especialidad médica asignada a la atención. |
| **Doctores / Personal Médico** | **Colección raíz** `doctores` | Directorio de profesionales colegiados con especialidad y horario de atención para asignación en expedientes y consultas. |
| **Laboratorios Diagnósticos** | **Colección raíz** `laboratorios` | Unidades y departamentos de diagnóstico especializado (Hematología, Bioquímica, Microbiología, etc.) con responsable, horario y ubicación. |
| **Tipos de Exámenes** | **Colección catálogo** `tipos_examenes` | Catálogo maestro de análisis clínicos asociados a cada unidad de laboratorio con muestra requerida, parámetros y tiempo de respuesta. |
| **Órdenes de Laboratorio** | **Colección transaccional** `ordenes_laboratorio` | Solicitudes de exámenes asociadas a pacientes y laboratorios, con resultados biométricos y estado. |

---

## 2. Índices Principales

* **`pacientes`**:
  * `{ expediente: 1 }` (Unique): Búsqueda rápida por número de expediente clínico (`EXP-XXXXX`).
  * `{ documentoIdentidad: 1 }` (Unique): Llave única de consulta en red institucional.
  * `{ "nombre": "text", "apellidos": "text" }`: Búsqueda predictiva por nombre.
* **`consultas`**:
  * `{ pacienteId: 1, fecha: -1 }`: Recuperación cronológica del historial clínico completo del paciente.
  * `{ expediente: 1, fecha: -1 }`: Índice alternativo por expediente.
* **`polizas`**:
  * `{ idPoliza: 1 }` (Unique): Identificador de póliza única emitida.
  * `{ pacienteId: 1 }`: Paciente asegurado vinculado.
  * `{ "aseguradora.nombreEmpresa": 1 }`: Búsquedas por aseguradora emisora.
* **`doctores`**:
  * `{ idColegiado: 1 }` (Unique): Número de colegiado médico único.
  * `{ "nombre": "text", "apellidos": "text", "especialidad": "text" }`: Búsqueda predictiva en directorio médico.
* **`laboratorios`**:
  * `{ codigo: 1 }` (Unique): Código único de la unidad de laboratorio (ej. `LAB-HEM`).
  * `{ "nombre": "text", "tipo": "text", "responsable": "text" }`: Búsqueda de unidades de laboratorio.
* **`tipos_examenes`**:
  * `{ codigoExamen: 1 }` (Unique): Código único del análisis clínico.
  * `{ laboratorioId: 1 }`: Asociación al laboratorio emisor.
  * `{ "nombre": "text", "categoria": "text" }`: Búsqueda de análisis por texto.
* **`ordenes_laboratorio`**:
  * `{ codigoOrden: 1 }` (Unique): Código de orden clínica (#ORD-XXXX).
  * `{ pacienteId: 1, fechaOrden: -1 }`: Historial de órdenes de laboratorio por paciente.
  * `{ laboratorioId: 1 }`: Órdenes canalizadas por laboratorio.
