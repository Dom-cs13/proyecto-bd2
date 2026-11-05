# Modelo Documental · MongoDB (Hospital General · I1)

> Documentación de arquitectura de datos para MongoDB Atlas y MongoDB Compass.
> Basado en el modelo conceptual del Hospital General (Fase I).

---

## 1. Decisiones de Embebido vs. Referenciado

| Entidad Relacional | Estrategia en MongoDB | Justificación |
|---|---|---|
| **Paciente** | Colección raíz `pacientes` | Entidad primaria de búsqueda y control clínico. |
| **Póliza & Aseguradora** | **Embebido** en `pacientes.polizaSeguro` | Relación 1:1 o 1:pocos que se lee siempre junto al paciente en cada ingreso. |
| **Detalles Hospitalarios** | **Embebido** en `pacientes.detallesInstitucion` | Cama, pabellón, tipo de sangre y antecedentes críticos (específicos de I1). |
| **Consultas** | Colección separada `consultas` | Crecimiento no acotado a lo largo de los años. Indexada por `pacienteId`. |
| **Diagnóstico** | **Embebido** en `consultas.diagnostico` | Relación 1:1 atómica dentro del episodio médico. |
| **Tratamiento** | **Embebido** en `consultas.diagnostico.tratamiento` | El tratamiento depende directamente del diagnóstico clínico asignado. |
| **Receta & Medicamentos**| **Embebido** en `tratamiento.receta.detalles[]` | La prescripción y desglose de fármacos (dosis, cantidad, frecuencia) pertenecen al episodio. |
| **Servicios** | **Embebido** en `consultas.servicios[]` | Snapshot del catálogo de especialidad médica asignada a la atención. |

---

## 2. Índices Principales

* **`pacientes`**:
  * `{ expediente: 1 }` (Unique): Búsqueda rápida por número de expediente clínico (`EXP-XXXXX`).
  * `{ documentoIdentidad: 1 }` (Unique): Llave única de consulta en red institucional.
  * `{ "nombre": "text", "apellidos": "text" }`: Búsqueda predictiva por nombre.
* **`consultas`**:
  * `{ pacienteId: 1, fecha: -1 }`: Recuperación cronológica del historial clínico completo del paciente.
  * `{ expediente: 1, fecha: -1 }`: Índice alternativo por expediente.
