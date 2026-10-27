/**
 * Datos locales de simulación para el Hospital General
 * Cumplen estrictamente con el contrato y el documento de Entrega I
 */
export const MOCK_PACIENTES = [
  {
    id: "pac-001",
    expediente: "EXP-01842",
    nombre: "Mariana",
    apellidos: "Soto Hernández",
    fechaNacimiento: "1990-04-18",
    genero: "Femenino",
    curp: "SOHM900418MDF09",
    telefono: "+52 55 1234 5678",
    correo: "mariana.soto@correo.com",
    direccion: "Av. Central 45, Quetzaltenango",
    contactoEmergencia: {
      nombre: "Roberto Soto",
      parentesco: "Padre",
      telefono: "+52 55 9876 5432"
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
      antecedentesCriticos: ["Hipertensión arterial controlada", "Alergia a la penicilina"],
      tipoSangre: "O+",
      seguro: {
        aseguradora: "Seguros Médicos del Valle",
        poliza: "POL-98421",
        cobertura: 80
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
          id: "con-101",
          fecha: "2026-10-26T09:15:00.000Z",
          motivo: "Revisión post-operatoria de apendicectomía",
          medico: "Dr. Rodrigo Palma",
          observaciones: "Herida quirúrgica limpia, afebril, adecuada tolerancia oral.",
          diagnosticos: [
            {
              id: "diag-201",
              codigoCie: "K35.80",
              descripcion: "Apendicitis aguda en evolución favorable",
              tratamientos: [
                {
                  id: "trat-301",
                  descripcion: "Curas diarias de herida quirúrgica y deambulación asistida",
                  diasDuracion: 5,
                  fechaInicio: "2026-10-26",
                  fechaFin: "2026-10-31"
                }
              ]
            }
          ],
          recetas: [
            {
              id: "rec-401",
              medicamentos: [
                { nombre: "Paracetamol", dosis: "500 mg", frecuencia: "Cada 8 horas", duracion: "3 días", cantidad: 9, indicaciones: "Tomar después de alimentos" },
                { nombre: "Ciprofloxacino", dosis: "500 mg", frecuencia: "Cada 12 horas", duracion: "5 días", cantidad: 10, indicaciones: "Completar tratamiento antimicrobiano" }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: "pac-002",
    expediente: "EXP-02491",
    nombre: "Carlos",
    apellidos: "Méndez Silva",
    fechaNacimiento: "1982-02-11",
    genero: "Masculino",
    curp: "MESC830211HDF04",
    telefono: "+52 55 2345 6789",
    correo: "carlos.mendez@correo.com",
    direccion: "Calle Real 12-30, Zona 3",
    contactoEmergencia: {
      nombre: "Laura Méndez",
      parentesco: "Esposa",
      telefono: "+52 55 8765 4321"
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
    id: "pac-003",
    expediente: "EXP-04205",
    nombre: "Diego",
    apellidos: "Ramírez Morales",
    fechaNacimiento: "1963-09-15",
    genero: "Masculino",
    curp: "RAMD640915HDF08",
    telefono: "+52 55 3456 7890",
    correo: "diego.ramirez@correo.com",
    direccion: "Colonia Los Altos 4-15",
    contactoEmergencia: {
      nombre: "Carmen Ramírez",
      parentesco: "Hija",
      telefono: "+52 55 7654 3210"
    },
    servicioArea: "Hospitalización",
    medicoTratante: "Dr. Esteban Vega",
    ubicacion: "Pabellón B - Cama 204",
    ultimaConsulta: "2026-10-25T18:00:00.000Z",
    estadoClinico: "observacion",
    estadoArchivo: "activo",
    detallesInstitucion: {
      institucionId: "I1",
      nombreInstitucion: "Hospital General",
      antecedentesCriticos: ["Insuficiencia respiratoria leve", "Asma bronquial"],
      tipoSangre: "B+",
      seguro: {
        aseguradora: "Aseguradora Universal",
        poliza: "POL-77612",
        cobertura: 85
      },
      internamiento: {
        enCama: true,
        pabellon: "Pabellón B",
        cama: "Cama 204",
        fechaIngreso: "2026-10-22T11:00:00.000Z"
      }
    },
    historial: { consultas: [] }
  },
  {
    id: "pac-004",
    expediente: "EXP-06390",
    nombre: "Roberto",
    apellidos: "Navarro Ruiz",
    fechaNacimiento: "1969-03-12",
    genero: "Masculino",
    curp: "NARR700312HDF05",
    telefono: "+52 55 4567 8901",
    correo: "roberto.navarro@correo.com",
    direccion: "Barrio El Calvario 2-90",
    contactoEmergencia: {
      nombre: "Gloria Ruiz",
      parentesco: "Madre",
      telefono: "+52 55 6543 2109"
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
        aseguradora: "Seguros Médicos del Valle",
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

/**
 * Exámenes y resultados de laboratorio del Hospital
 */
export const MOCK_LABORATORIOS = [
  {
    id: "lab-001",
    codigoOrden: "ORD-9921",
    pacienteId: "pac-001",
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
    pacienteId: "pac-002",
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
    pacienteId: "pac-004",
    expediente: "EXP-06390",
    pacienteNombre: "Roberto Navarro Ruiz",
    tipoExamen: "Tiempos de Coagulación (TP y TTP)",
    fechaOrden: "2026-10-26T08:00:00.000Z",
    fechaResultado: "2026-10-26T12:15:00.000Z",
    solicitante: "Dra. Elena Morales",
    estado: "Completado",
    resultadoResumen: "Tiempos dentro de rango para intervención quirúrgica",
    valores: [
      { parametro: "Tiempo de Protrombina (TP)", valor: "12.4 seg", referencia: "11.0 - 13.5 seg", estado: "normal" },
      { parametro: "INR", valor: "1.05", referencia: "0.8 - 1.2", estado: "normal" },
      { parametro: "Tiempo de Tromboplastina Parcial (TTP)", valor: "31.0 seg", referencia: "25.0 - 35.0 seg", estado: "normal" }
    ],
    observacionesTecnicas: "Apto para procedimiento traumatológico."
  },
  {
    id: "lab-004",
    codigoOrden: "ORD-9935",
    pacienteId: "pac-003",
    expediente: "EXP-04205",
    pacienteNombre: "Diego Ramírez Morales",
    tipoExamen: "Gasometría Arterial",
    fechaOrden: "2026-10-26T15:00:00.000Z",
    fechaResultado: null,
    solicitante: "Dr. Esteban Vega",
    estado: "En proceso",
    resultadoResumen: "Muestra en analizador de gases",
    valores: [],
    observacionesTecnicas: "Procesamiento prioritario por estado de observación respiratoria."
  }
];
