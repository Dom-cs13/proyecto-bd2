---
name: modelo-documental
description: Diseña las colecciones de MongoDB (Hospital) o Firestore (Laboratorio) del proyecto BD II. Úsala al decidir qué se embebe o se referencia, índices y JSON Schema o reglas en infra/database/mongodb o infra/database/firestore.
---

# Modelo documental

1. Mantén la jerarquía del núcleo: paciente → consulta → diagnóstico → tratamiento, y consulta → receta → detalles.
2. Embebe lo pequeño, acotado y que siempre se lee con el padre. Referencia lo que crece sin límite.
3. Hospital (Mongo): demográficos, alergias y antecedentes críticos embebidos en `pacientes`; `consultas` en colección aparte indexada por `pacienteId`.
4. Laboratorio (Firestore): raíz `pacientes`, subcolección `ordenes` con `resultados` como mapa por tipo de examen. Respeta el límite de 1 MB por documento.
5. Documenta cada decisión en `infra/database/<motor>/` (JSON Schema, índices, `estructura.md`) y resúmela en la Entrega I.
6. Firestore: `firestore.rules` en deny-all; la defensa real es IAM con cuenta de servicio mínima.
