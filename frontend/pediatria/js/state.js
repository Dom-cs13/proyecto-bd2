/**
 * Estado Reactivo Pediátrico - Centro Pediátrico (I4)
 * Cumple la Regla #2 (LSP):
 * - id siempre string
 * - camelCase estricto
 * - fechas ISO-8601
 * - datos propios en detallesInstitucion
 * - estado de archivo vive SOLO en historial.estado
 */

const PACIENTES_INICIALES = [
  {
    id: "ped-01",
    expediente: "PED-0101",
    nombre: "Mateo",
    apellidos: "García Morales",
    fechaNacimiento: "2024-03-12",
    genero: "Masculino",
    documentoIdentidad: "3051498210101",
    telefono: "+502 5551-2341",
    correo: "madre.mateo@correo.com",
    direccion: "Zona 11, Colonia Mariscal, Ciudad de Guatemala",
    estadoClinico: "estable",
    detallesInstitucion: {
      institucionId: "I4",
      nombreInstitucion: "Centro Pediátrico",
      tipoSangre: "O+",
      tutorPrincipal: {
        nombre: "Valeria Morales de García",
        parentesco: "Madre",
        documento: "1984210540101",
        telefono: "+502 5551-2341",
        correo: "madre.mateo@correo.com"
      },
      alergias: [
        { alergeno: "Amoxicilina", severidad: "alta" }
      ],
      controlesCrecimiento: [
        {
          id: "cc-101",
          fecha: "2026-10-15",
          edadMeses: 31,
          pesoKg: 13.8,
          tallaCm: 92.5,
          perimetroCefalicoCm: 49.2,
          imc: 16.1,
          observaciones: "Desarrollo psicomotor adecuado, percentiles P50-P75."
        },
        {
          id: "cc-102",
          fecha: "2026-06-10",
          edadMeses: 27,
          pesoKg: 12.9,
          tallaCm: 89.0,
          perimetroCefalicoCm: 48.6,
          imc: 16.3,
          observaciones: "Control de niño sano dentro del rango estándar."
        }
      ],
      vacunasAplicadas: [
        { vacunaId: "VAC-01", nombreVacuna: "BCG (Tuberculosis)", dosis: 1, fechaAplicacion: "2024-03-13", lote: "BCG-991", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-02", nombreVacuna: "Hepatitis B", dosis: 1, fechaAplicacion: "2024-03-13", lote: "HB-104", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 1, fechaAplicacion: "2024-05-15", lote: "PV-201", responsable: "Enf. Carlos Soto" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 2, fechaAplicacion: "2024-07-20", lote: "PV-308", responsable: "Enf. Carlos Soto" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 3, fechaAplicacion: "2024-09-18", lote: "PV-415", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-06", nombreVacuna: "SRP (Triple Viral)", dosis: 1, fechaAplicacion: "2025-03-20", lote: "SRP-501", responsable: "Enf. Rosa Elena" }
      ]
    },
    historial: {
      estado: "activo",
      consultas: [
        {
          id: "con-101",
          fecha: "2026-10-15T15:00:00.000Z",
          medico: "Dra. Sofía Mendoza",
          motivo: "Control de niño sano y tos leve nocturna",
          diagnosticos: [
            {
              id: "dx-101",
              codigo: "J00",
              descripcion: "Rinofaringitis aguda estacional",
              tratamientos: [
                { id: "tx-101", descripcion: "Higiene nasal con solución salina estéril", dias: 7 }
              ]
            }
          ],
          recetas: [
            {
              id: "rx-101",
              medicamentos: [
                { nombre: "Solución Salina 0.9%", dosis: "2 nebulizaciones cada fosa", frecuencia: "Cada 8 horas", duracion: "7 días" }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "ped-02",
    expediente: "PED-0102",
    nombre: "Camila",
    apellidos: "López Castillo",
    fechaNacimiento: "2025-08-04",
    genero: "Femenino",
    documentoIdentidad: "3189402190101",
    telefono: "+502 5412-8974",
    correo: "padre.camila@correo.com",
    direccion: "Zona 7, Kaminal Juyú, Ciudad de Guatemala",
    estadoClinico: "observacion",
    detallesInstitucion: {
      institucionId: "I4",
      nombreInstitucion: "Centro Pediátrico",
      tipoSangre: "A+",
      tutorPrincipal: {
        nombre: "Fernando López Alvarado",
        parentesco: "Padre",
        documento: "2104598120101",
        telefono: "+502 5412-8974",
        correo: "padre.camila@correo.com"
      },
      alergias: [
        { alergeno: "Proteína de leche de vaca (APLV)", severidad: "media" }
      ],
      controlesCrecimiento: [
        {
          id: "cc-201",
          fecha: "2026-10-28",
          edadMeses: 14,
          pesoKg: 9.2,
          tallaCm: 76.0,
          perimetroCefalicoCm: 46.0,
          imc: 15.9,
          observaciones: "Monitoreo por intolerancia alimentaria. Ganancia de peso constante."
        }
      ],
      vacunasAplicadas: [
        { vacunaId: "VAC-01", nombreVacuna: "BCG (Tuberculosis)", dosis: 1, fechaAplicacion: "2025-08-05", lote: "BCG-110", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-02", nombreVacuna: "Hepatitis B", dosis: 1, fechaAplicacion: "2025-08-05", lote: "HB-214", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 1, fechaAplicacion: "2025-10-10", lote: "PV-701", responsable: "Enf. Carlos Soto" }
      ]
    },
    historial: {
      estado: "activo",
      consultas: [
        {
          id: "con-201",
          fecha: "2026-10-28T10:30:00.000Z",
          medico: "Dr. Alejandro Barrios",
          motivo: "Control de alimentación complementaria y prueba de tolerancia",
          diagnosticos: [
            {
              id: "dx-201",
              codigo: "K52.2",
              descripcion: "Alergia o gastroenteritis alérgica por alimentos",
              tratamientos: [
                { id: "tx-201", descripcion: "Fórmula extensamente hidrolizada y reintroducción guiada", dias: 30 }
              ]
            }
          ],
          recetas: []
        }
      ]
    }
  },
  {
    id: "ped-03",
    expediente: "PED-0103",
    nombre: "Emiliano",
    apellidos: "Hernández Reyes",
    fechaNacimiento: "2022-11-20",
    genero: "Masculino",
    documentoIdentidad: "2941058200101",
    telefono: "+502 4789-1122",
    correo: "madre.emiliano@correo.com",
    direccion: "Mixco, Zona 4, Condado Naranjo",
    estadoClinico: "estable",
    detallesInstitucion: {
      institucionId: "I4",
      nombreInstitucion: "Centro Pediátrico",
      tipoSangre: "B+",
      tutorPrincipal: {
        nombre: "Sofía Reyes de Hernández",
        parentesco: "Madre",
        documento: "1894025190101",
        telefono: "+502 4789-1122",
        correo: "madre.emiliano@correo.com"
      },
      alergias: [],
      controlesCrecimiento: [
        {
          id: "cc-301",
          fecha: "2026-09-12",
          edadMeses: 46,
          pesoKg: 16.5,
          tallaCm: 104.0,
          perimetroCefalicoCm: 50.8,
          imc: 15.3,
          observaciones: "Excelente estado nutricional y motricidad fina desarrollada."
        }
      ],
      vacunasAplicadas: [
        { vacunaId: "VAC-01", nombreVacuna: "BCG (Tuberculosis)", dosis: 1, fechaAplicacion: "2022-11-21", lote: "BCG-880", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 1, fechaAplicacion: "2023-01-25", lote: "PV-112", responsable: "Enf. Carlos Soto" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 2, fechaAplicacion: "2023-03-28", lote: "PV-220", responsable: "Enf. Carlos Soto" },
        { vacunaId: "VAC-03", nombreVacuna: "Pentavalente", dosis: 3, fechaAplicacion: "2023-05-30", lote: "PV-335", responsable: "Enf. Rosa Elena" },
        { vacunaId: "VAC-06", nombreVacuna: "SRP (Triple Viral)", dosis: 1, fechaAplicacion: "2023-11-25", lote: "SRP-440", responsable: "Enf. Rosa Elena" }
      ]
    },
    historial: {
      estado: "activo",
      consultas: []
    }
  }
];

export const ESQUEMA_NACIONAL_VACUNAS = [
  { vacunaId: "VAC-01", nombreVacuna: "BCG (Tuberculosis)", dosis: 1, edadRecomendada: "Al nacer" },
  { vacunaId: "VAC-02", nombreVacuna: "Hepatitis B Pediátrica", dosis: 1, edadRecomendada: "Primeras 24 horas" },
  { vacunaId: "VAC-03", nombreVacuna: "Pentavalente (DPT + HB + Hib)", dosis: 1, edadRecomendada: "2 meses" },
  { vacunaId: "VAC-03", nombreVacuna: "Pentavalente (DPT + HB + Hib)", dosis: 2, edadRecomendada: "4 meses" },
  { vacunaId: "VAC-03", nombreVacuna: "Pentavalente (DPT + HB + Hib)", dosis: 3, edadRecomendada: "6 meses" },
  { vacunaId: "VAC-04", nombreVacuna: "Rotavirus", dosis: 1, edadRecomendada: "2 meses" },
  { vacunaId: "VAC-04", nombreVacuna: "Rotavirus", dosis: 2, edadRecomendada: "4 meses" },
  { vacunaId: "VAC-05", nombreVacuna: "Neumococo Conjugada", dosis: 1, edadRecomendada: "2 meses" },
  { vacunaId: "VAC-05", nombreVacuna: "Neumococo Conjugada", dosis: 2, edadRecomendada: "4 meses" },
  { vacunaId: "VAC-06", nombreVacuna: "SRP (Sarampión, Rubeola, Paperas)", dosis: 1, edadRecomendada: "12 meses" },
  { vacunaId: "VAC-06", nombreVacuna: "SRP (Sarampión, Rubeola, Paperas)", dosis: 2, edadRecomendada: "18 meses" }
];

class PediatriaStore {
  constructor() {
    this.pacientes = [...PACIENTES_INICIALES];
    this.filtroTexto = "";
    this.pacienteSeleccionadoId = this.pacientes[0]?.id || null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  setFiltroTexto(texto) {
    this.filtroTexto = (texto || "").toLowerCase().trim();
    this.notify();
  }

  setPacienteSeleccionado(id) {
    this.pacienteSeleccionadoId = id;
    this.notify();
  }

  getPacienteSeleccionado() {
    return this.pacientes.find(p => p.id === this.pacienteSeleccionadoId) || this.pacientes[0];
  }

  getPacientesFiltrados() {
    if (!this.filtroTexto) return this.pacientes;
    return this.pacientes.filter(p => {
      const nom = `${p.nombre} ${p.apellidos}`.toLowerCase();
      const exp = (p.expediente || "").toLowerCase();
      const doc = (p.documentoIdentidad || "").toLowerCase();
      const tutor = (p.detallesInstitucion?.tutorPrincipal?.nombre || "").toLowerCase();
      return nom.includes(this.filtroTexto) ||
             exp.includes(this.filtroTexto) ||
             doc.includes(this.filtroTexto) ||
             tutor.includes(this.filtroTexto);
    });
  }

  agregarPaciente(nuevoPaciente) {
    this.pacientes.unshift(nuevoPaciente);
    this.pacienteSeleccionadoId = nuevoPaciente.id;
    this.notify();
  }

  archivarPaciente(id, { tipo, detalle }) {
    const p = this.pacientes.find(item => item.id === id);
    if (!p) return;
    p.historial.estado = "archivado";
    p.historial.fechaArchivo = new Date().toISOString();
    p.historial.motivoArchivo = { tipo, detalle };
    this.notify();
  }

  agregarControlCrecimiento(pacienteId, nuevoControl) {
    const p = this.pacientes.find(item => item.id === pacienteId);
    if (!p) return;
    if (!p.detallesInstitucion.controlesCrecimiento) {
      p.detallesInstitucion.controlesCrecimiento = [];
    }
    p.detallesInstitucion.controlesCrecimiento.unshift(nuevoControl);
    this.notify();
  }

  registrarVacuna(pacienteId, nuevaVacuna) {
    const p = this.pacientes.find(item => item.id === pacienteId);
    if (!p) return;
    if (!p.detallesInstitucion.vacunasAplicadas) {
      p.detallesInstitucion.vacunasAplicadas = [];
    }
    p.detallesInstitucion.vacunasAplicadas.push(nuevaVacuna);
    this.notify();
  }

  agregarConsulta(pacienteId, nuevaConsulta) {
    const p = this.pacientes.find(item => item.id === pacienteId);
    if (!p) return;
    p.historial.consultas.unshift(nuevaConsulta);
    this.notify();
  }

  getKPIs() {
    const activos = this.pacientes.filter(p => p.historial?.estado === "activo");
    const enObservacion = activos.filter(p => p.estadoClinico === "observacion" || p.estadoClinico === "critico").length;

    let totalControles = 0;
    let vacunasPendientes = 0;

    activos.forEach(p => {
      totalControles += (p.detallesInstitucion?.controlesCrecimiento?.length || 0);
      const aplicadas = p.detallesInstitucion?.vacunasAplicadas?.length || 0;
      const esperadas = ESQUEMA_NACIONAL_VACUNAS.length;
      if (aplicadas < esperadas) {
        vacunasPendientes += (esperadas - aplicadas);
      }
    });

    return {
      totalPacientes: activos.length,
      enObservacion,
      totalControles,
      vacunasPendientes
    };
  }
}

export const store = new PediatriaStore();
