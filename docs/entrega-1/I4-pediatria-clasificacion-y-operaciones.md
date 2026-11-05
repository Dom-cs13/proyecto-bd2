# Clasificación de Datos y Catálogo de Operaciones · Centro Pediátrico (I4-01)

**Institución:** Centro Pediátrico (I4)
**Motor:** MariaDB
**Roles del centro:**
- `pediatra`: Médico pediatra tratante (acceso clínico completo).
- `enfermeria`: Personal de enfermería (triaje, antropometría, inmunizaciones y alergias).
- `recepcion`: Personal de admisión y secretaría (citas, datos demográficos y tutores).

---

## 1. Niveles de Confidencialidad de la Información

1. **Público / Institucional:** Información general, catálogos del sistema (vacunas, medicamentos, alérgenos, roles) y estado técnico de servicios.
2. **Confidencial:** Datos demográficos del menor (nombres, fecha de nacimiento, sexo), datos de contacto del tutor legal, fechas y horarios de citas programadas, y estado administrativo del expediente (`activo` / `archivado`).
3. **Restringido (Sensible):** Expediente médico, diagnósticos clínicos (CIE-10), tratamientos prescritos, recetas farmacológicas con posología, observaciones de consulta, métricas antropométricas en evaluación de desnutrición/obesidad, reacciones adversas y sospechas de maltrato o notas reservadas.

---

## 2. Matriz de Clasificación: Entidad / Campo × Nivel de Seguridad × Rol

| Entidad / Campo | Nivel de Seguridad | Recepción | Enfermería | Pediatra |
|---|:---:|:---:|:---:|:---:|
| **Paciente:** `nombres`, `apellidos`, `documento` | Confidencial | Lectura / Escritura | Lectura | Lectura / Escritura |
| **Paciente:** `fechaNacimiento`, `sexo` | Confidencial | Lectura / Escritura | Lectura | Lectura / Escritura |
| **Paciente:** `grupoSanguineo` | Confidencial | Lectura | Lectura / Escritura | Lectura / Escritura |
| **Paciente:** `direccion`, `telefono`, `correo` | Confidencial | Lectura / Escritura | Lectura | Lectura |
| **Tutor:** `dpi`, `nombres`, `parentesco`, `contacto` | Confidencial | Lectura / Escritura | Lectura | Lectura / Escritura |
| **Tutor:** `esPrincipal` | Confidencial | Lectura / Escritura | Lectura | Lectura / Escritura |
| **Historial:** `estado` (`activo` / `archivado`) | Confidencial | Lectura | Lectura | Lectura |
| **Historial:** `motivoArchivo` (`tipo`, `detalle`) | Confidencial | Lectura / Escritura | Solo Lectura | Lectura / Escritura |
| **Cita:** `fecha`, `hora`, `estado`, `motivo` | Confidencial | Lectura / Escritura | Lectura | Lectura / Escritura |
| **Control Antropométrico:** `pesoKg`, `tallaCm` | Restringido | Oculto | Lectura / Escritura | Lectura / Escritura |
| **Control Antropométrico:** `perimetroCefalico`, `imc`, `percentil` | Restringido | Oculto | Lectura / Escritura | Lectura / Escritura |
| **Vacunación:** `vacuna`, `dosis`, `fecha`, `lote` | Restringido | Oculto | Lectura / Escritura | Lectura / Escritura |
| **Alergias:** `alergia`, `severidad`, `reaccion` | Restringido | Oculto | Lectura / Escritura | Lectura / Escritura |
| **Consulta:** `motivo`, `observaciones` | Restringido | Oculto | Solo Lectura | Lectura / Escritura |
| **Diagnóstico:** `codigoCie10`, `descripcion` | Restringido | Oculto | Solo Lectura | Lectura / Escritura |
| **Tratamiento:** `descripcion`, `fechas`, `estado` | Restringido | Oculto | Solo Lectura | Lectura / Escritura |
| **Receta:** `medicamento`, `dosis`, `frecuencia`, `duracion` | Restringido | Oculto | Solo Lectura | Lectura / Escritura |
| **Auditoría:** `usuario`, `accion`, `datosAnteriores` | Restringido | Oculto | Oculto | Solo Lectura |

---

## 3. Catálogo de Operaciones en Lenguaje Sencillo (Usuario Final)

### Módulo de Admisión y Recepción
1. **Registrar nuevo paciente pediátrico:** Permite registrar la información básica del menor (nombre, fecha de nacimiento, documento de identificación) y asociar de forma obligatoria al menos a un padre o tutor legal identificado con su DPI y número telefónico.
2. **Designar o actualizar tutor principal:** Define cuál de los tutores legales registrados es el contacto principal para autorizaciones médicas de emergencia. El sistema solo permite tener un tutor principal activo a la vez.
3. **Agendar cita pediátrica:** Permite programar la visita de un paciente con un pediatra específico en una fecha y hora determinada, validando que el horario esté libre.
4. **Archivar expediente infantil con justificación:** Permite pasar un expediente activo al estado archivado documentando el motivo formal (traslado de centro médico, fallecimiento, trámite administrativo u otro motivo justificado).

### Módulo de Enfermería y Triaje
5. **Registrar control de crecimiento y desarrollo:** Permite ingresar las mediciones físicas tomadas en el triaje pediátrico (peso en kilogramos, estatura o talla en centímetros, perímetro cefálico). El sistema calcula el IMC de forma automática y clasifica los rangos percentilares.
6. **Registrar aplicación de vacuna (Carnet digital):** Permite anotar la fecha exacta, el biológico aplicado, el número de dosis del esquema oficial y el número de lote del frasco administrado al menor.
7. **Reportar alergia conocida:** Permite documentar si el paciente presenta intolerancias o alergias a medicamentos, alimentos o sustancias del entorno, tipificando su severidad (leve, moderada, severa o anafilaxia).

### Módulo Médico Pediátrico
8. **Iniciar y atender consulta médica:** Permite al pediatra abrir la consulta del paciente, revisar antecedentes previos, registrar el motivo de la visita y las notas de evolución médica.
9. **Emitir diagnóstico clínico:** Permite asentar las conclusiones diagnósticas del encuentro asociando opcionalmente el código CIE-10 internacional.
10. **Prescribir tratamiento médico:** Permite registrar las indicaciones terapéuticas vinculadas estrictamente a un diagnóstico previo, con fecha de inicio, fin previsto y recomendaciones.
11. **Generar receta médica pediátrica:** Permite prescribir fármacos pediátricos calculando la dosis adecuada con base en el peso del menor, indicando frecuencia, duración y recomendaciones de toma para los padres.
