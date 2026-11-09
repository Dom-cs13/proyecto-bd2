/**
 * Datos iniciales del Hospital General sincronizados con MongoDB Compass / Atlas.
 * Solo contiene los 3 registros existentes en la base de datos real.
 */
export const MOCK_PACIENTES = [
  {
    id: "650000000000000000000001",
    expediente: "EXP-01842",
    nombre: "Mariana",
    apellidos: "Soto Hernández",
    fechaNacimiento: "1990-04-18",
    genero: "Femenino",
    curp: "2984512300101",
    telefono: "12345678",
    correo: "mariana.soto@hospital.com",
    direccion: "Av. Central 45, Quetzaltenango",
    contactoEmergencia: {
      nombre: "Roberto Soto",
      parentesco: "Padre",
      telefono: "98765432"
    },
    servicioArea: "Hospitalización",
    medicoTratante: "Dr. Rodrigo Palma",
    ubicacion: "Pabellón A - Cama 104",
    ultimaConsulta: "2026-10-26T09:15:00.000Z",
    estadoClinico: "estable",
    estadoArchivo: "activo",
    detallesInstitucion: {
      institucionId: "I1",
      nombreInstitucion: "Hospital General",
      antecedentesCriticos: ["Alergia a penicilina", "Hipertensión controlada"],
      tipoSangre: "O+",
      seguro: {
        aseguradora: "Seguros Universales",
        poliza: "POL-98421",
        cobertura: 85
      },
      internamiento: {
        enCama: true,
        pabellon: "Pabellón A",
        cama: "Cama 104",
        fechaIngreso: "2026-10-24T14:30:00.000Z"
      }
    },
    historial: {
      consultas: [
        {
          id: "651000000000000000000001",
          fecha: "2026-10-26T09:15:00.000Z",
          motivo: "Revisión post-operatoria de apendicectomía y retiro de drenaje",
          medico: "Dr. Rodrigo Palma",
          observaciones: "Herida quirúrgica limpia, sin signos de infección ni eritema, afebril.",
          diagnosticos: [
            {
              id: "diag-01",
              codigoCie: "K35.80",
              descripcion: "Apendicitis aguda fase III en evolución post-quirúrgica favorable",
              tratamientos: [
                {
                  id: "trat-01",
                  descripcion: "Curas diarias con solución antiséptica y deambulación progresiva",
                  diasDuracion: 5,
                  fechaInicio: "2026-10-26",
                  fechaFin: "2026-10-31"
                }
              ]
            }
          ],
          recetas: [
            {
              id: "rec-01",
              medicamentos: [
                { nombre: "Paracetamol", dosis: "500 mg", frecuencia: "Cada 8 horas", duracion: "3 días", cantidad: 9, indicaciones: "Tomar por vía oral después de los alimentos." },
                { nombre: "Ciprofloxacino", dosis: "500 mg", frecuencia: "Cada 12 horas", duracion: "5 días", cantidad: 10, indicaciones: "Completar tratamiento antimicrobiano profiláctico." }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "650000000000000000000002",
    expediente: "EXP-02491",
    nombre: "Carlos",
    apellidos: "Méndez Silva",
    fechaNacimiento: "1982-02-11",
    genero: "Masculino",
    curp: "1892345670101",
    telefono: "23456789",
    correo: "carlos.mendez@hospital.com",
    direccion: "Calle Real 12-30, Zona 3",
    contactoEmergencia: {
      nombre: "Laura Méndez",
      parentesco: "Esposa",
      telefono: "87654321"
    },
    servicioArea: "Medicina General",
    medicoTratante: "Dra. Ana Ruiz",
    ubicacion: "Consultorio 104",
    ultimaConsulta: "2026-10-26T08:30:00.000Z",
    estadoClinico: "estable",
    estadoArchivo: "activo",
    detallesInstitucion: {
      institucionId: "I1",
      nombreInstitucion: "Hospital General",
      antecedentesCriticos: ["Diabetes Tipo 2"],
      tipoSangre: "A+",
      seguro: {
        aseguradora: "Roble Salud",
        poliza: "POL-33214",
        cobertura: 70
      },
      internamiento: { enCama: false }
    },
    historial: { consultas: [] }
  },
  {
    id: "650000000000000000000003",
    expediente: "EXP-06390",
    nombre: "Roberto",
    apellidos: "Navarro Ruiz",
    fechaNacimiento: "1969-03-12",
    genero: "Masculino",
    curp: "1029384750101",
    telefono: "45678901",
    correo: "roberto.navarro@hospital.com",
    direccion: "Barrio El Calvario 2-90",
    contactoEmergencia: {
      nombre: "Gloria Ruiz",
      parentesco: "Madre",
      telefono: "65432109"
    },
    servicioArea: "Hospitalización",
    medicoTratante: "Dra. Elena Morales",
    ubicacion: "Traumatología - Cama 112",
    ultimaConsulta: "2026-10-24T16:20:00.000Z",
    estadoClinico: "critico",
    estadoArchivo: "activo",
    detallesInstitucion: {
      institucionId: "I1",
      nombreInstitucion: "Hospital General",
      antecedentesCriticos: ["Politraumatismo vial", "Fractura de fémur expuesta"],
      tipoSangre: "O-",
      seguro: {
        aseguradora: "Seguros Universales",
        poliza: "POL-55120",
        cobertura: 90
      },
      internamiento: {
        enCama: true,
        pabellon: "Traumatología",
        cama: "Cama 112",
        fechaIngreso: "2026-10-18T20:15:00.000Z"
      }
    },
    historial: { consultas: [] }
  }
];

export const MOCK_UNIDADES_LABORATORIO = [
  {
    id: "654000000000000000000001",
    codigo: "LAB-HEM",
    nombre: "Laboratorio de Hematología y Banco de Sangre",
    tipo: "Hematología",
    responsable: "Licda. Karla Monroy · Q.F.B. (Col. 4521)",
    ubicacion: "Edificio Central - Nivel 2, Ala Norte",
    telefono: "23456781",
    correo: "hematologia@hospitalgeneral.gob.gt",
    horario: "24 Horas / Turno Continuo",
    descripcion: "Biometría hemática completa, tiempos de coagulación, frotis y banco de hemocomponentes.",
    estado: "activo",
    institucionId: "I1"
  },
  {
    id: "654000000000000000000002",
    codigo: "LAB-BIO",
    nombre: "Laboratorio de Bioquímica Clínica y Metabólica",
    tipo: "Bioquímica",
    responsable: "Lic. Mario Gómez · Bioquímico (Col. 3890)",
    ubicacion: "Edificio Central - Nivel 2, Ala Sur",
    telefono: "23456782",
    correo: "bioquimica@hospitalgeneral.gob.gt",
    horario: "Lunes a Domingo 06:00 - 22:00",
    descripcion: "Análisis de electrolitos, perfiles lipídicos, función renal, hepática y monitoreo glucémico.",
    estado: "activo",
    institucionId: "I1"
  },
  {
    id: "654000000000000000000003",
    codigo: "LAB-MIC",
    nombre: "Laboratorio de Microbiología e Infectología",
    tipo: "Microbiología",
    responsable: "Dr. Fernando Morales · Infectólogo (Col. 6712)",
    ubicacion: "Módulo Diagnóstico - Nivel 1",
    telefono: "23456783",
    correo: "microbiologia@hospitalgeneral.gob.gt",
    horario: "Lunes a Viernes 07:00 - 19:00",
    descripcion: "Cultivos bacteriológicos automatizados, antibiogramas, baciloscopías y biología molecular.",
    estado: "activo",
    institucionId: "I1"
  },
  {
    id: "654000000000000000000004",
    codigo: "LAB-INM",
    nombre: "Laboratorio de Inmunología y Serología Especializada",
    tipo: "Inmunología",
    responsable: "Dra. Patricia Valenzuela · Inmunóloga (Col. 5240)",
    ubicacion: "Módulo Diagnóstico - Nivel 2",
    telefono: "23456784",
    correo: "inmunologia@hospitalgeneral.gob.gt",
    horario: "Lunes a Viernes 08:00 - 17:00",
    descripcion: "Marcadores tumorales, pruebas serológicas de alta sensibilidad, hormonas y anticuerpos.",
    estado: "activo",
    institucionId: "I1"
  }
];

export const MOCK_TIPOS_EXAMENES = [
  {
    id: "655000000000000000000001",
    codigoExamen: "EX-HEM-01",
    laboratorioId: "654000000000000000000001",
    laboratorioCodigo: "LAB-HEM",
    laboratorioNombre: "Laboratorio de Hematología y Banco de Sangre",
    nombre: "Hematología Completa con Frotis Periférico",
    categoria: "Hematología",
    tipoMuestra: "Sangre Venosa con EDTA",
    tiempoEstimadoHoras: 2,
    indicacionesPaciente: "Ayuno de 4 a 6 horas. Muestra sin coágulos.",
    parametrosBase: ["Hemoglobina", "Hematocrito", "Glóbulos Blancos", "Plaquetas"],
    estado: "activo"
  },
  {
    id: "655000000000000000000002",
    codigoExamen: "EX-HEM-02",
    laboratorioId: "654000000000000000000001",
    laboratorioCodigo: "LAB-HEM",
    laboratorioNombre: "Laboratorio de Hematología y Banco de Sangre",
    nombre: "Tiempos de Coagulación (TP, TTP e INR)",
    categoria: "Hematología",
    tipoMuestra: "Plasma Citratado",
    tiempoEstimadoHoras: 3,
    indicacionesPaciente: "No suspender medicación salvo indicación médica.",
    parametrosBase: ["Tiempo de Protrombina (TP)", "TTP", "INR"],
    estado: "activo"
  },
  {
    id: "655000000000000000000003",
    codigoExamen: "EX-BIO-01",
    laboratorioId: "654000000000000000000002",
    laboratorioCodigo: "LAB-BIO",
    laboratorioNombre: "Laboratorio de Bioquímica Clínica y Metabólica",
    nombre: "Química Sanguínea (Glucosa, Urea, Creatinina)",
    categoria: "Bioquímica",
    tipoMuestra: "Suero Sanguíneo",
    tiempoEstimadoHoras: 4,
    indicacionesPaciente: "Ayuno estricto de 8 a 10 horas.",
    parametrosBase: ["Glucosa", "Urea", "Creatinina", "BUN"],
    estado: "activo"
  },
  {
    id: "655000000000000000000004",
    codigoExamen: "EX-BIO-02",
    laboratorioId: "654000000000000000000002",
    laboratorioCodigo: "LAB-BIO",
    laboratorioNombre: "Laboratorio de Bioquímica Clínica y Metabólica",
    nombre: "Perfil Lipídico Completo",
    categoria: "Bioquímica",
    tipoMuestra: "Suero Sanguíneo",
    tiempoEstimadoHoras: 4,
    indicacionesPaciente: "Ayuno estricto de 12 horas.",
    parametrosBase: ["Colesterol Total", "Triglicéridos", "HDL", "LDL"],
    estado: "activo"
  },
  {
    id: "655000000000000000000005",
    codigoExamen: "EX-MIC-01",
    laboratorioId: "654000000000000000000003",
    laboratorioCodigo: "LAB-MIC",
    laboratorioNombre: "Laboratorio de Microbiología e Infectología",
    nombre: "Urocultivo con Antibiograma Automatizado",
    categoria: "Microbiología",
    tipoMuestra: "Orina Chorro Medio (Estéril)",
    tiempoEstimadoHoras: 48,
    indicacionesPaciente: "Aseo genital previo. Primera orina de la mañana.",
    parametrosBase: ["Conteo Bacteriano (UFC/mL)", "Microorganismo", "Antibiograma"],
    estado: "activo"
  },
  {
    id: "655000000000000000000006",
    codigoExamen: "EX-INM-01",
    laboratorioId: "654000000000000000000004",
    laboratorioCodigo: "LAB-INM",
    laboratorioNombre: "Laboratorio de Inmunología y Serología Especializada",
    nombre: "Perfil Tiroideo Básico (TSH, T3, T4)",
    categoria: "Inmunología",
    tipoMuestra: "Suero Sanguíneo",
    tiempoEstimadoHoras: 6,
    indicacionesPaciente: "Ayuno de 4 horas.",
    parametrosBase: ["TSH", "T4 Libre", "T3 Libre"],
    estado: "activo"
  }
];

export const MOCK_LABORATORIOS = [
  {
    id: "lab-001",
    codigoOrden: "ORD-9921",
    pacienteId: "650000000000000000000001",
    expediente: "EXP-01842",
    pacienteNombre: "Mariana Soto Hernández",
    laboratorioId: "654000000000000000000001",
    laboratorioNombre: "Laboratorio de Hematología y Banco de Sangre",
    tipoExamen: "Hematología Completa",
    fechaOrden: "2026-10-25T10:00:00.000Z",
    fechaResultado: "2026-10-25T14:30:00.000Z",
    solicitante: "Dr. Rodrigo Palma",
    prioridad: "Normal",
    estado: "Completado",
    resultadoResumen: "Leucocitosis leve en remisión",
    valores: [
      { parametro: "Hemoglobina", valor: "13.2 g/dL", referencia: "12.0 - 15.5 g/dL", estado: "normal" },
      { parametro: "Hematocrito", valor: "40.1 %", referencia: "37.0 - 48.0 %", estado: "normal" },
      { parametro: "Glóbulos Blancos (Leucocitos)", valor: "10,800 /uL", referencia: "4,500 - 10,000 /uL", estado: "alerta" },
      { parametro: "Plaquetas", valor: "245,000 /uL", referencia: "150,000 - 450,000 /uL", estado: "normal" }
    ],
    observacionesTecnicas: "Muestra procesada sin hemólisis."
  },
  {
    id: "lab-002",
    codigoOrden: "ORD-9924",
    pacienteId: "650000000000000000000002",
    expediente: "EXP-02491",
    pacienteNombre: "Carlos Méndez Silva",
    laboratorioId: "654000000000000000000002",
    laboratorioNombre: "Laboratorio de Bioquímica Clínica y Metabólica",
    tipoExamen: "Química Sanguínea (Glucosa & Perfil Renal)",
    fechaOrden: "2026-10-26T07:30:00.000Z",
    fechaResultado: "2026-10-26T11:00:00.000Z",
    solicitante: "Dra. Ana Ruiz",
    prioridad: "Urgente",
    estado: "Completado",
    resultadoResumen: "Glucosa en ayunas elevada",
    valores: [
      { parametro: "Glucosa en Ayunas", valor: "148 mg/dL", referencia: "70 - 100 mg/dL", estado: "critico" },
      { parametro: "Urea", valor: "32 mg/dL", referencia: "15 - 45 mg/dL", estado: "normal" },
      { parametro: "Creatinina", valor: "0.9 mg/dL", referencia: "0.7 - 1.2 mg/dL", estado: "normal" }
    ],
    observacionesTecnicas: "Paciente refiere 8 horas de ayuno estricto."
  },
  {
    id: "lab-003",
    codigoOrden: "ORD-9930",
    pacienteId: "650000000000000000000003",
    expediente: "EXP-06390",
    pacienteNombre: "Roberto Navarro Ruiz",
    laboratorioId: "654000000000000000000001",
    laboratorioNombre: "Laboratorio de Hematología y Banco de Sangre",
    tipoExamen: "Tiempos de Coagulación (TP y TTP)",
    fechaOrden: "2026-10-26T08:00:00.000Z",
    fechaResultado: "2026-10-26T12:15:00.000Z",
    solicitante: "Dra. Elena Morales",
    prioridad: "Stat / Emergencia",
    estado: "Completado",
    resultadoResumen: "Tiempos dentro de rango para intervención traumatológica",
    valores: [
      { parametro: "Tiempo de Protrombina (TP)", valor: "12.4 seg", referencia: "11.0 - 13.5 seg", estado: "normal" },
      { parametro: "INR", valor: "1.05", referencia: "0.8 - 1.2", estado: "normal" },
      { parametro: "Tiempo de Tromboplastina Parcial (TTP)", valor: "31.0 seg", referencia: "25.0 - 35.0 seg", estado: "normal" }
    ],
    observacionesTecnicas: "Apto para procedimiento traumatológico en Pabellón Traumatología."
  }
];

export const MOCK_POLIZAS = [
  {
    id: "pol-001",
    idPoliza: "POL-98421",
    cobertura: "Hospitalaria completa",
    porcentajeCobertura: 85,
    fechaInicio: "2026-01-01",
    fechaVencimiento: "2026-12-31",
    estado: "vigente",
    pacienteId: "650000000000000000000001",
    expediente: "EXP-01842",
    pacienteNombre: "Mariana Soto Hernández",
    aseguradora: {
      idAseguradora: "ASEG-01",
      nombreEmpresa: "Seguros Universales",
      nitIdentificador: "1234567-8",
      telefono: "23456789"
    }
  },
  {
    id: "pol-002",
    idPoliza: "POL-33214",
    cobertura: "Consulta Externa y Diagnóstico",
    porcentajeCobertura: 70,
    fechaInicio: "2026-02-15",
    fechaVencimiento: "2027-02-15",
    estado: "vigente",
    pacienteId: "650000000000000000000002",
    expediente: "EXP-02491",
    pacienteNombre: "Carlos Méndez Silva",
    aseguradora: {
      idAseguradora: "ASEG-02",
      nombreEmpresa: "Roble Salud",
      nitIdentificador: "9876543-2",
      telefono: "22334455"
    }
  },
  {
    id: "pol-003",
    idPoliza: "POL-55120",
    cobertura: "Traumatología y Cirugía",
    porcentajeCobertura: 90,
    fechaInicio: "2026-03-01",
    fechaVencimiento: "2027-03-01",
    estado: "vigente",
    pacienteId: "650000000000000000000003",
    expediente: "EXP-06390",
    pacienteNombre: "Roberto Navarro Ruiz",
    aseguradora: {
      idAseguradora: "ASEG-01",
      nombreEmpresa: "Seguros Universales",
      nitIdentificador: "1234567-8",
      telefono: "23456789"
    }
  },
  {
    id: "pol-004",
    idPoliza: "POL-77140",
    cobertura: "Accidentes y Emergencias",
    porcentajeCobertura: 80,
    fechaInicio: "2026-04-01",
    fechaVencimiento: "2027-04-01",
    estado: "vigente",
    pacienteId: null,
    expediente: null,
    pacienteNombre: "Sin asignar",
    aseguradora: {
      idAseguradora: "ASEG-03",
      nombreEmpresa: "Aseguradora General",
      nitIdentificador: "3456789-0",
      telefono: "24225566"
    }
  },
  {
    id: "pol-005",
    idPoliza: "POL-88230",
    cobertura: "Maternidad y Neonatología",
    porcentajeCobertura: 75,
    fechaInicio: "2026-05-01",
    fechaVencimiento: "2027-05-01",
    estado: "vigente",
    pacienteId: null,
    expediente: null,
    pacienteNombre: "Sin asignar",
    aseguradora: {
      idAseguradora: "ASEG-04",
      nombreEmpresa: "Mapfre Guatemala",
      nitIdentificador: "5678901-2",
      telefono: "23880000"
    }
  }
];

export const MOCK_DOCTORES = [
  {
    id: "doc-001",
    idColegiado: "COL-07412",
    nombre: "Rodrigo",
    apellidos: "Palma",
    especialidad: "Cirugía General",
    telefono: "23456789",
    correo: "rodrigo.palma@hospital.com",
    horario: "Turno Completo",
    estado: "activo",
    institucionId: "I1"
  },
  {
    id: "doc-002",
    idColegiado: "COL-08194",
    nombre: "Ana",
    apellidos: "Ruiz",
    especialidad: "Medicina General",
    telefono: "22334455",
    correo: "ana.ruiz@hospital.com",
    horario: "Matutino (07:00 - 15:00)",
    estado: "de turno",
    institucionId: "I1"
  },
  {
    id: "doc-003",
    idColegiado: "COL-06231",
    nombre: "Elena",
    apellidos: "Morales",
    especialidad: "Traumatología y Ortopedia",
    telefono: "24567890",
    correo: "elena.morales@hospital.com",
    horario: "Vespertino (13:00 - 20:00)",
    estado: "activo",
    institucionId: "I1"
  },
  {
    id: "doc-004",
    idColegiado: "COL-09315",
    nombre: "Carlos",
    apellidos: "Estrada",
    especialidad: "Medicina Interna",
    telefono: "25678901",
    correo: "carlos.estrada@hospital.com",
    horario: "Nocturno (20:00 - 07:00)",
    estado: "activo",
    institucionId: "I1"
  }
];
