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

export const MOCK_LABORATORIOS = [
  {
    id: "lab-001",
    codigoOrden: "ORD-9921",
    pacienteId: "650000000000000000000001",
    expediente: "EXP-01842",
    pacienteNombre: "Mariana Soto Hernández",
    tipoExamen: "Hematología Completa",
    fechaOrden: "2026-10-25T10:00:00.000Z",
    fechaResultado: "2026-10-25T14:30:00.000Z",
    solicitante: "Dr. Rodrigo Palma",
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
    tipoExamen: "Química Sanguínea (Glucosa & Perfil Renal)",
    fechaOrden: "2026-10-26T07:30:00.000Z",
    fechaResultado: "2026-10-26T11:00:00.000Z",
    solicitante: "Dra. Ana Ruiz",
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
    tipoExamen: "Tiempos de Coagulación (TP y TTP)",
    fechaOrden: "2026-10-26T08:00:00.000Z",
    fechaResultado: "2026-10-26T12:15:00.000Z",
    solicitante: "Dra. Elena Morales",
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
