export function fechaSoloDiaISO(valor) {
  if (valor == null) return null;
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  return String(valor).slice(0, 10);
}

export function fechaHoraISO(valor) {
  if (valor == null) return null;
  if (valor instanceof Date) {
    return valor.toISOString();
  }
  const str = String(valor);
  if (str.includes('T')) {
    return str;
  }
  // Para formatos DATETIME 'YYYY-MM-DD HH:mm:ss'
  const parseada = new Date(str.replace(' ', 'T') + 'Z');
  return !Number.isNaN(parseada.getTime()) ? parseada.toISOString() : str;
}

export function pacienteDesdeFila(fila, detalles = {}) {
  if (!fila) return null;

  return {
    id: String(fila.id_paciente),
    documento: fila.documento ?? null,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    fechaNacimiento: fechaSoloDiaISO(fila.fecha_nacimiento),
    sexo: fila.sexo ?? null,
    telefono: fila.telefono ?? null,
    correo: fila.correo ?? null,
    direccion: fila.direccion ?? null,
    detallesInstitucion: {
      grupoSanguineo: fila.grupo_sanguineo ?? null,
      tutorPrincipal: detalles.tutorPrincipal ?? null,
      alergias: detalles.alergias ?? [],
      controlesCrecimiento: detalles.controlesCrecimiento ?? [],
      vacunasAplicadas: detalles.vacunasAplicadas ?? [],
    },
  };
}

export function historialDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_historial),
    pacienteId: String(fila.id_paciente),
    estado: fila.estado,
    fechaCreacion: fechaHoraISO(fila.fecha_creacion),
    fechaArchivo: fechaHoraISO(fila.fecha_archivo),
    motivoArchivo: fila.motivo_archivo_tipo
      ? {
          tipo: fila.motivo_archivo_tipo,
          detalle: fila.motivo_archivo_detalle,
        }
      : null,
  };
}

export function consultaDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_consulta),
    pacienteId: String(fila.id_paciente),
    usuarioId: String(fila.id_usuario),
    citaId: fila.id_cita == null ? null : String(fila.id_cita),
    fecha: fechaHoraISO(fila.fecha),
    motivo: fila.motivo ?? null,
    observaciones: fila.observaciones ?? null,
    estado: fila.estado,
    detallesInstitucion: {},
  };
}

export function controlCrecimientoDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_control),
    pacienteId: String(fila.id_paciente),
    consultaId: fila.id_consulta == null ? null : String(fila.id_consulta),
    fecha: fechaSoloDiaISO(fila.fecha),
    edadMeses: Number(fila.edad_meses),
    pesoKg: Number(fila.peso_kg),
    tallaCm: Number(fila.talla_cm),
    perimetroCefalicoCm: fila.perimetro_cefalico_cm == null ? null : Number(fila.perimetro_cefalico_cm),
    imc: fila.imc == null ? null : Number(fila.imc),
    percentilOms: fila.percentil_oms ?? null,
  };
}

export function vacunaAplicadaDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_vacuna_aplicada),
    pacienteId: String(fila.id_paciente),
    vacunaId: String(fila.id_vacuna),
    nombreVacuna: fila.nombre_vacuna ?? fila.nombre ?? null,
    numeroDosis: Number(fila.numero_dosis),
    consultaId: fila.id_consulta == null ? null : String(fila.id_consulta),
    fechaAplicacion: fechaSoloDiaISO(fila.fecha_aplicacion),
    lote: fila.lote,
    reaccionAdversa: fila.reaccion_adversa ?? null,
  };
}
