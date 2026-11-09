# Diseño Documental e Infraestructura de Firestore · Laboratorio Clínico (I3)

## 1. Dónde colocar tu API Key y Credenciales de Firebase

Para vincular este proyecto a Firebase Firestore, sigue estos pasos:

### 1.1 Configurar el archivo `.env`
En la raíz del proyecto, crea (o edita) tu archivo `.env` basándote en `.env.example`:

```env
# ==============================================================================
# I3: Laboratorio Clínico (Firebase Firestore)
# ==============================================================================

# 1. API Key de Firebase (desde la consola del proyecto)
FIREBASE_API_KEY=tu_firebase_api_key_de_ejemplo

# 2. Identificador único de tu proyecto en Firebase
FIREBASE_PROJECT_ID=mi-laboratorio-clinico

# 3. Credenciales de la Cuenta de Servicio (Service Account)
# Puedes elegir la Opción A o la Opción B:

# --- OPCIÓN A (Recomendada): Variables de entorno directas ---
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mi-laboratorio-clinico.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu_clave_privada_aqui\n-----END PRIVATE KEY-----\n"

# --- OPCIÓN B (Alternativa local): Ruta al archivo JSON descargado ---
# FIREBASE_SERVICE_ACCOUNT_PATH=./infra/database/firestore/serviceAccountKey.json
```

### 1.2 ¿Cómo obtener estos valores en Firebase Console?
1. **API Key y Project ID:**
   - Entra a [Firebase Console](https://console.firebase.google.com/).
   - Selecciona o crea tu proyecto.
   - Haz clic en el engranaje ⚙️ **Configuración del proyecto** > pestaña **General**.
   - En la sección "Tus apps", verás tu **Web API Key** y el **Id. de proyecto**.
2. **Clave privada de Cuenta de Servicio:**
   - En **Configuración del proyecto**, ve a la pestaña **Cuentas de servicio**.
   - Haz clic en **"Generar nueva clave privada"**.
   - Se descargará un archivo `.json` con `project_id`, `client_email` y `private_key`.
   - Copia esos valores a las variables de tu archivo `.env` o coloca el `.json` en `infra/database/firestore/serviceAccountKey.json`.

---

## 2. Arquitectura de Colecciones en Firestore

Se implementa el diseño documental establecido en la sección 7.4 de `PLANIFICACION.md`:

```
pacientes/ (colección raíz)
  └── {pacienteId}/ (documento)
        ├── demográficos, contacto, tipoSangre, alergias, activo
        ├── detallesInstitucion: { institucionId: "I3", ... }
        └── consultas/ (subcolección)
              └── {consultaId}/ (documento con diagnósticos y recetas)

ordenes/ (colección raíz)
  └── {ordenId}/ (documento)
        ├── numeroOrden, pacienteId, fechaSolicitud, medicoSolicitante
        ├── tipoLaboratorio, examenesSolicitados, prioridad, estadoOrden
        └── auditoria: { createdAt, updatedAt }

muestras/ (colección raíz vinculada por ordenId)
  └── {muestraId}/ (documento)
        ├── ordenId, codigoBarras, tipoMuestra, fechaToma, condicionMuestra, estadoMuestra

resultados/ (colección raíz vinculada por ordenId y muestraId)
  └── {resultadoId}/ (documento con polimorfismo por tipo)
        ├── ordenId, muestraId, examenCodigo, tipoLaboratorio
        ├── valorResultado: { ...campos específicos de los 8 tipos... }
        ├── flagAnormalidad, estadoResultado, auditoria, historialVersiones
```

---

## 3. Catálogos y los 8 Tipos de Laboratorio

1. **Hematología:** `hemoglobina`, `hematocrito`, `eritrocitos`, `leucocitos`, `plaquetas`, etc.
2. **Química Clínica:** `valor_numerico`, `unidad_medida`, `rango_referencia_min`, `rango_referencia_max`, `flag_anormalidad`, `metodo_analitico`, `equipo_utilizado`.
3. **Urianálisis:** `color`, `aspecto`, `densidad`, `ph`, `proteinas`, `glucosa`, `cetonas`, `sangre`, `leucocitos_esterasa`, `nitritos`, sedimentos.
4. **Inmunología / Serología:** `metodo`, `resultado_cualitativo`, `resultado_cuantitativo`, `punto_corte`, `interpretacion`.
5. **Microbiología:** `tipo_muestra`, `microorganismo_aislado`, `recuento_colonias`, `antibiograma` (array: antibiótico, sensibilidad, CMI).
6. **Coagulación:** `tp_segundos`, `inr`, `ttpa_segundos`, `fibrinogeno`, `dimerod`, tiempos de sangría y coagulación.
7. **Banco de Sangre:** `grupo_abo`, `factor_rh`, `coombs_directo`, `coombs_indirecto`, `prueba_cruzada`.
8. **Biología Molecular:** `tipo_tecnica`, `gen_diana`, `resultado_cualitativo`, `carga_viral`, `limite_deteccion`.

---

## 4. Regla Importante de Integridad (Regla 8)

Los datos del paciente conservan los mismos atributos exactos que en el núcleo y los demás módulos:
- `id` (string)
- `documentoIdentidad` / `cui` (string, obligatorio y único)
- `nombre` y `apellidos` (separados)
- `fechaNacimiento` (YYYY-MM-DD)
- `genero`, `tipoSangre`, `telefono`, `correo`, `direccion`, `alergias`
- `detallesInstitucion` para datos propios del laboratorio clínico.
