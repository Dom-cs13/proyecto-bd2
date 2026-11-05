# Especificación para Agente: Tipos de Laboratorios y Campos del Sistema

## 1. Backend

### 1.1 Mejora la legibilidad
**Separacion de archivos :** Reduce el tamaño de los archivos separandolos 

### 1.2 Infrastructura de firebase
**Proyecto :**  Deja aramada una base para vincularlo a firebase, deja indicado donde ira mi api key

## 2. Tipos de Laboratorio

### 2.1 Laboratorio de Hematología
**Descripción:** Análisis de sangre y componentes celulares.

**Exámenes típicos:**
- Hemograma completo (CBC)
- Recuento diferencial de leucocitos
- Recuento de plaquetas
- Hemoglobina / Hematocrito
- VSG (Velocidad de Sedimentación Globular)
- Reticulocitos

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `hemoglobina` | decimal (g/dL) | Sí | Rango por sexo/edad |
| `hematocrito` | decimal (%) | Sí | |
| `eritrocitos` | decimal (millones/µL) | Sí | |
| `leucocitos` | decimal (miles/µL) | Sí | |
| `plaquetas` | entero (miles/µL) | Sí | |
| `neutrofilos_pct` | decimal (%) | No | Diferencial |
| `linfocitos_pct` | decimal (%) | No | Diferencial |
| `monocitos_pct` | decimal (%) | No | Diferencial |
| `eosinofilos_pct` | decimal (%) | No | Diferencial |
| `basofilos_pct` | decimal (%) | No | Diferencial |
| `vcm` | decimal (fL) | No | Volumen corpuscular medio |
| `hcm` | decimal (pg) | No | Hemoglobina corpuscular media |
| `reticulocitos_pct` | decimal (%) | No | |

---

### 2.2 Laboratorio de Química Clínica / Bioquímica
**Descripción:** Análisis de componentes químicos en sangre, suero o plasma.

**Exámenes típicos:**
- Glucosa
- Perfil lipídico (colesterol total, HDL, LDL, triglicéridos)
- Función renal (creatinina, urea/BUN)
- Función hepática (ALT, AST, bilirrubinas, GGT, fosfatasa alcalina)
- Electrolitos (sodio, potasio, cloro, bicarbonato)
- Ácido úrico
- Calcio, fósforo, magnesio
- Amilasa, lipasa
- TSH, T3, T4
- HbA1c

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `valor_numerico` | decimal | Sí | Con unidad de medida |
| `unidad_medida` | string | Sí | mg/dL, mmol/L, U/L, etc. |
| `rango_referencia_min` | decimal | Sí | Ajustado por edad/sexo |
| `rango_referencia_max` | decimal | Sí | |
| `metodo_analitico` | string | No | Enzimático, colorimétrico, etc. |
| `equipo_utilizado` | string | No | Analizador |
| `flag_anormalidad` | enum | Sí | normal / alto / bajo / crítico |

---

### 2.3 Laboratorio de Urianálisis
**Descripción:** Análisis físico-químico y microscópico de orina.

**Exámenes típicos:**
- Examen general de orina (EGO)
- Tira reactiva
- Sedimento urinario
- Microalbuminuria
- Depuración de creatinina

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `color` | string | Sí | Amarillo, ámbar, rojo, etc. |
| `aspecto` | string | Sí | Claro, turbio, etc. |
| `densidad` | decimal | Sí | |
| `ph` | decimal | Sí | |
| `proteinas` | enum | Sí | negativo / trazas / + / ++ / +++ |
| `glucosa` | enum | Sí | negativo / trazas / + / ++ / +++ |
| `cetonas` | enum | Sí | negativo / trazas / + / ++ / +++ |
| `sangre` | enum | Sí | negativo / trazas / + / ++ / +++ |
| `leucocitos_esterasa` | enum | Sí | negativo / trazas / + / ++ / +++ |
| `nitritos` | enum | Sí | negativo / positivo |
| `bilirrubina` | enum | No | negativo / positivo |
| `urobilinogeno` | enum | No | normal / aumentado |
| `sedimento_eritrocitos` | entero (por campo) | No | |
| `sedimento_leucocitos` | entero (por campo) | No | |
| `sedimento_celulas_epiteliales` | string | No | Escasas, moderadas, abundantes |
| `sedimento_cilindros` | string | No | Tipo y cantidad |
| `sedimento_cristales` | string | No | Tipo y cantidad |
| `sedimento_bacterias` | string | No | Escasas, moderadas, abundantes |

---

### 2.4 Laboratorio de Inmunología / Serología
**Descripción:** Pruebas de anticuerpos, antígenos y marcadores inmunológicos.

**Exámenes típicos:**
- Prueba de embarazo (hCG)
- Serologías infecciosas (VIH, VHB, VHC, sífilis)
- Anticuerpos anti-nucleares (ANA)
- Factor reumatoide
- Proteína C reactiva (PCR)
- Procalcitonina
- Marcadores tumorales (AFP, CEA, CA-125, PSA)
- TSH, hormonas
- Tipaje sanguíneo

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `resultado_cualitativo` | enum | No | positivo / negativo / indeterminado |
| `resultado_cuantitativo` | decimal | No | Cuando aplique |
| `unidad_medida` | string | No | UI/mL, mUI/L, etc. |
| `punto_corte` | decimal | No | Valor de referencia para positividad |
| `metodo` | string | Sí | ELISA, quimioluminiscencia, inmunocromatografía, etc. |
| `interpretacion` | string | No | Texto libre del técnico |

---

### 2.5 Laboratorio de Microbiología
**Descripción:** Cultivos, identificación de microorganismos y pruebas de sensibilidad.

**Exámenes típicos:**
- Urocultivo
- Hemocultivo
- Coprocultivo
- Cultivo de secreciones (faringe, heridas, esputo)
- Antibiograma
- Tinción de Gram
- Baciloscopia (BK)
- Cultivo de hongos

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tipo_muestra` | string | Sí | Orina, sangre, heces, esputo, etc. |
| `tincion_gram` | string | No | Gram positivo/negativo, forma |
| `microorganismo_aislado` | string | No | Nombre científico |
| `recuento_colonias` | string | No | UFC/mL o descripción |
| `antibiograma` | array | No | Lista de antibióticos con resultado |
| `antibiotico_nombre` | string | No | |
| `antibiotico_sensibilidad` | enum | No | sensible / intermedio / resistente |
| `antibiotico_cmi` | decimal | No | Concentración mínima inhibitoria |
| `observaciones` | text | No | |

---

### 2.6 Laboratorio de Coagulación
**Descripción:** Pruebas de coagulación sanguínea.

**Exámenes típicos:**
- Tiempo de protrombina (TP) / INR
- Tiempo de tromboplastina parcial activada (TTPa)
- Fibrinógeno
- Dímero D
- Tiempo de sangría
- Tiempo de coagulación

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tp_segundos` | decimal | No | |
| `inr` | decimal | No | |
| `ttpa_segundos` | decimal | No | |
| `fibrinogeno` | decimal (mg/dL) | No | |
| `dimerod` | decimal (ng/mL) | No | |
| `tiempo_sangria` | decimal (min) | No | |
| `tiempo_coagulacion` | decimal (min) | No | |

---

### 2.7 Banco de Sangre (opcional)
**Descripción:** Tipaje sanguíneo, pruebas cruzadas y componentes.

**Exámenes típicos:**
- Grupo sanguíneo ABO
- Factor Rh
- Prueba cruzada
- Coombs directo / indirecto

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `grupo_abo` | enum | Sí | A / B / AB / O |
| `factor_rh` | enum | Sí | positivo / negativo |
| `coombs_directo` | enum | No | positivo / negativo |
| `coombs_indirecto` | enum | No | positivo / negativo |
| `prueba_cruzada` | enum | No | compatible / incompatible |

---

### 2.8 Laboratorio de Biología Molecular (opcional / avanzado)
**Descripción:** Pruebas de ADN/ARN, PCR, secuenciación.

**Exámenes típicos:**
- PCR COVID-19
- PCR tuberculosis
- Carga viral VIH/VHC
- Genotipificación
- Secuenciación

**Campos específicos del resultado:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `tipo_tecnica` | string | Sí | PCR convencional, RT-PCR, secuenciación |
| `gen_diana` | string | No | Gen o región amplificada |
| `resultado_cualitativo` | enum | No | detectado / no detectado / indeterminado |
| `carga_viral` | decimal | No | copias/mL |
| `limite_deteccion` | decimal | No | |
| `equipo_utilizado` | string | No | Termociclador |

---

## 3. Campos Comunes a Todos los Laboratorios

### 3.1 Datos del Paciente
| Campo | Tipo | Obligatorio |
|---|---|---|
| `paciente_id` | string (UUID) | Sí |
| `documento_identidad` | string | Sí |
| `nombre_completo` | string | Sí |
| `sexo` | enum (M/F/O) | Sí |
| `fecha_nacimiento` | date | Sí |
| `edad` | integer (calculado) | Sí |
| `telefono` | string | No |
| `email` | string | No |
| `direccion` | string | No |
| `tipo_paciente` | enum (ambulatorio/hospitalizado/emergencia) | Sí |
| `servicio_procedencia` | string | No |

### 3.2 Datos de la Orden
| Campo | Tipo | Obligatorio |
|---|---|---|
| `orden_id` | string (UUID) | Sí |
| `numero_orden` | string | Sí |
| `fecha_solicitud` | datetime | Sí |
| `medico_solicitante` | string | Sí |
| `especialidad_solicitante` | string | No |
| `tipo_laboratorio` | enum | Sí |
| `examenes_solicitados` | array | Sí |
| `prioridad` | enum (rutina/urgente) | Sí |
| `observaciones_orden` | text | No |
| `estado_orden` | enum | Sí |

### 3.3 Datos de la Muestra
| Campo | Tipo | Obligatorio |
|---|---|---|
| `muestra_id` | string (UUID) | Sí |
| `codigo_barras` | string | Sí |
| `tipo_muestra` | enum | Sí |
| `fecha_toma` | datetime | Sí |
| `fecha_recepcion` | datetime | Sí |
| `volumen` | decimal | No |
| `contenedor` | string | No |
| `condicion_muestra` | enum | Sí |
| `estado_muestra` | enum | Sí |
| `observaciones_muestra` | text | No |

**Valores de `tipo_muestra`:** sangre_venosa, sangre_capilar, suero, plasma, orina, heces, esputo, LCR, liquido_sinovial, secrecion, hisopado, tejido, otro.

**Valores de `condicion_muestra`:** optima, hemolizada, lipemica, icterica, insuficiente, coagulada, contaminada, rechazada.

**Valores de `estado_muestra`:** registrada, recibida, en_proceso, completada, rechazada.

### 3.4 Datos del Resultado
| Campo | Tipo | Obligatorio |
|---|---|---|
| `resultado_id` | string (UUID) | Sí |
| `orden_id` | string (FK) | Sí |
| `muestra_id` | string (FK) | Sí |
| `examen_codigo` | string | Sí |
| `examen_nombre` | string | Sí |
| `tipo_laboratorio` | enum | Sí |
| `valor_resultado` | mixed | Sí |
| `unidad_medida` | string | No |
| `rango_referencia` | string | No |
| `flag_anormalidad` | enum | Sí |
| `metodo` | string | No |
| `equipo` | string | No |
| `fecha_resultado` | datetime | Sí |
| `tecnico_ingreso` | string | Sí |
| `tecnico_valido` | string | No |
| `fecha_validacion` | datetime | No |
| `estado_resultado` | enum | Sí |
| `comentarios` | text | No |

**Valores de `flag_anormalidad`:** normal, alto, bajo, critico_alto, critico_bajo.

**Valores de `estado_resultado`:** preliminar, final, corregido, validado.

---

## 4. Catálogos Necesarios

| Catálogo | Descripción |
|---|---|
| `cat_tipos_laboratorio` | Hematología, Química, Urianálisis, Inmunología, Microbiología, Coagulación, Banco de Sangre, Biología Molecular |
| `cat_examenes` | Código, nombre, tipo_laboratorio, unidad, método, precio |
| `cat_tipos_muestra` | Sangre venosa, orina, heces, etc. |
| `cat_unidades_medida` | g/dL, mg/dL, mmol/L, UI/mL, etc. |
| `cat_rangos_referencia` | Examen, sexo, edad_min, edad_max, valor_min, valor_max |
| `cat_antibioticos` | Nombre, código, grupo farmacológico |
| `cat_estados` | Estados de orden, muestra, resultado |
| `cat_metodos` | ELISA, PCR, enzimático, etc. |

---

## 5. Reglas de Negocio para el Agente

1. **Toda orden debe tener al menos un examen** asociado a un tipo de laboratorio válido.
2. **Toda muestra debe estar vinculada a una orden** y tener código de barras único.
3. **Un resultado no puede validarse** si la muestra está en estado `rechazada` o `insuficiente`.
4. **Los rangos de referencia deben ajustarse** por sexo y edad del paciente al momento de interpretar el resultado.
5. **Los resultados críticos** deben generar una alerta inmediata al médico solicitante.
6. **El antibiograma solo aplica** a resultados de Microbiología con microorganismo aislado.
7. **La validación técnica** requiere usuario con rol `validador` y fecha/hora de validación.
8. **Los resultados corregidos** deben mantener historial de versiones (auditoría).
9. **El tipo de muestra debe ser compatible** con el examen solicitado (ej: urocultivo requiere orina).
10. **Cada tipo de laboratorio** tiene su propio conjunto de campos específicos de resultado; el agente debe validar que los campos obligatorios estén presentes antes de permitir la validación.

---

## 6. Estructura de Datos Sugerida (Relaciones)

```
paciente (1) ─── (N) orden
orden (1) ─── (N) muestra
orden (1) ─── (N) resultado
muestra (1) ─── (N) resultado
resultado (1) ─── (N) antibiograma_detalle  [solo microbiología]
examen (1) ─── (N) resultado
examen (N) ─── (1) tipo_laboratorio
examen (1) ─── (N) rango_referencia
```

---

## 7. Notas para el Agente

- Usar **UUIDs** como claves primarias.
- Implementar **soft delete** en todas las entidades principales.
- Registrar **auditoría** (created_at, updated_at, created_by, updated_by) en todas las tablas.
- Los campos `enum` deben validarse contra catálogo, no como texto libre.
- El `flag_anormalidad` debe calcularse automáticamente comparando `valor_resultado` con `rango_referencia` del paciente.
- Para resultados cualitativos (positivo/negativo), el flag se determina por el `punto_corte` o por regla del examen.
- El sistema debe permitir **múltiples resultados por orden** (un resultado por examen solicitado).
- La **prioridad urgente** debe reflejarse en el flujo: notificación inmediata al área correspondiente.


## 8. Regla importante

** REVISA EL BACK DE LOS DEMAS TIPOS MODULOS Y SI LOS DATOS QUE PROPONGO PARA EL PACIENTE NO SON LOS MISMOS QUE SE TIENEN, NO AGREGUES MIS DATOS Y AGREGA LOS QUE ESTEN PRESENTES**