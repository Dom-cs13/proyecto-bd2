# Mockups y Plantilla de Diseño UI · Alba Suite

Este documento centraliza el diseño visual y la plantilla de interfaz para la plataforma clínica compartida de **Bases de Datos II**, garantizando congruencia visual y funcional entre los frontends de las 4 instituciones.

---

## 🎨 Enlace Oficial de Figma

🔗 **[Mockup Interface for Hospital System (Figma)](https://www.figma.com/make/nSuCFca83prlqv8Ob82RgG/Mockup-interface-for-hospital-system?t=Lx9Olxh1vjk8THJl-1)**

---

## 🏛️ Congruencia Multi-institucional

El diseño se basa en el sistema visual **Alba Suite** (paleta profesional de salud con tonos Teal / Dark Cyan y superficies limpias). Para respetar la arquitectura hexagonal y la regla DRY del proyecto ([`AGENTS.md`](../AGENTS.md) regla 5 y [`PLANIFICACION.md`](../docs/planificacion/PLANIFICACION.md) sección 7.6):

1. **Base compartida (`frontend/shared/`):**
   - Todos los frontends importan el cliente de API (`shared/js/api/`), los componentes modulares y el layout base (`shared/css/`).
2. **Personalización por institución (`frontend/<institucion>/`):**
   - Cada institución define su propio tema (`css/tema.css`) alterando las variables CSS de acento si corresponde, y renderiza sus campos propios en la sección `detallesInstitucion`.
3. **Login general (`frontend/index.html`):**
   - Punto de entrada único. El usuario elige su institución, inicia sesión y el sistema lo envía al portal que indica su JWT.
   - Cada portal llama a `exigirSesion('<institucion>')` de `shared/js/api/auth.js`: sin sesión vuelve al login; con sesión de otra institución, va a la suya.

---

## 📐 Vistas y Componentes Canónicos en el Mockup

| Vista / Componente | Descripción | Archivo de Referencia |
|---|---|---|
| **Login general** | Pantalla completa: panel gráfico a la izquierda (ruleta de ilustraciones que gira y cambia de tono según la institución, con burbujas que suben despacio), onda de separación y formulario a la derecha. | `frontend/index.html` |
| **Sidebar Lateral** | Menú fijo de navegación con branding institucional, avatar médico y enlaces de sección. | `components/sidebar.js` |
| **Header de Navegación** | Barra superior con botones de sección rápida y botón de acción principal (+ Nuevo Paciente). | `index.html` |
| **Dashboard Principal** | Bienvenida médica, KPI cards de ocupación/camas y lista de pacientes prioritarios en observación. | `pages/principal.html`, `kpiCards.js` |
| **Buscador Clínico Predictivo** | Búsqueda por documento, nombre o expediente con filtrado instantáneo. | `components/searchBar.js` |
| **Tabla de Expedientes Clínicos** | Listado tabular con badge de expediente, aseguradora, diagnóstico principal y semáforo de estado. | `pages/gestion-pacientes.html`, `patientTable.js` |
| **Drawer Flotante Lateral** | Panel deslizable 360° para detalle de expediente, notas clínicas, nueva consulta y archivado justificado. | `components/modalDrawer.js` |
| **Unidad de Laboratorio** | Grilla y tabla de órdenes analíticas, valores biométricos y estado de procesamiento. | `pages/laboratorio.html`, `laboratorioTable.js` |
| **Archivado Justificado** | Flujo de desactivación legal sin borrado físico (conforme al contrato). | `components/listaArchivar.js` |

---

## Tipografía

Todo el proyecto usa **Schibsted Grotesk** (Google Fonts). Se carga una sola vez desde `frontend/shared/css/fuentes.css`, que define `--font-family`.

- Cada página la enlaza antes de sus propios estilos: `<link rel="stylesheet" href="../shared/css/fuentes.css">` (en `frontend/index.html`, la ruta es `./shared/css/fuentes.css`).
- Ningún frontend declara otra fuente; los estilos usan `font-family: var(--font-family)`.
- Pesos de referencia: 400 texto, 600 etiquetas y botones secundarios, 700 botones y títulos.
- No se usan emojis en la interfaz; los íconos son SVG.

## Tonos por institución

| Institución | `--tono` | `--tono-claro` |
|---|---|---|
| Hospital General | `#00595d` | `#e0f7f6` |
| Clínica Odontológica | `#1e5a8a` | `#e3eefa` |
| Laboratorio Clínico | `#5b4a9e` | `#ece9f7` |
| Centro Pediátrico | `#b4562a` | `#fbece4` |

---

## 🎨 Design Tokens (Variables CSS)

Los frontends deben basarse en las variables definidas en `css/variables.css`:

```css
:root {
  /* Marca principal */
  --primary: #00595d;
  --primary-hover: #004548;
  --primary-light: #e0f2fe;
  --primary-border: #80cbc4;

  /* Superficies y Fondos */
  --bg-main: #f4f8f8;
  --bg-card: #ffffff;
  --bg-subtle: #f0f7f7;
  --border-color: #d1e0e0;

  /* Tipografía */
  --text-main: #1f2937;
  --text-muted: #64748b;
  --text-inverse: #ffffff;

  /* Semáforo de Estado Clínico */
  --status-stable: #10b981;    /* Verde: Estable */
  --status-warning: #f59e0b;   /* Ámbar: Delicado */
  --status-critical: #ef4444;  /* Rojo: Crítico / Urgencias */
  --status-archived: #9ca3af;  /* Gris: Archivado */

  /* Badges */
  --badge-cyan-bg: #d9f5f5;
  --badge-cyan-text: #006064;
}
```

---

## 🚀 Implementación de Referencia

La primera implementación que adopta este mockup se encuentra en:
👉 **[`frontend/hospital/`](../frontend/hospital/)** (Hospital General · I1).
Las instituciones I2 (Odontología), I3 (Laboratorio) e I4 (Pediatría) deben usar esta misma guía para sus interfaces.
