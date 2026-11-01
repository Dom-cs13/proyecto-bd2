function fechaISO(valor) {
  if (valor == null) return null;

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  return String(valor).slice(0, 10);
}

export function pacienteDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_paciente),
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    fechaNacimiento: fechaISO(fila.fecha_nacimiento),
    sexo: fila.sexo,
    telefono: fila.telefono,
    correo: fila.correo,
    direccion: fila.direccion,
    detallesInstitucion: {},
  };
}

export function historialDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_historial),
    pacienteId: String(fila.id_paciente),
    estado: fila.estado,
    fechaCreacion: fila.fecha_creacion?.toISOString?.() ?? fila.fecha_creacion,
    fechaArchivo: fila.fecha_archivo?.toISOString?.() ?? fila.fecha_archivo,
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
    fecha: fila.fecha instanceof Date
      ? fila.fecha.toISOString()
      : fila.fecha,
    motivo: fila.motivo,
    observaciones: fila.observaciones,
    estado: fila.estado,
    detallesInstitucion: {
      polizaId: fila.id_poliza == null ? null : String(fila.id_poliza),
    },
  };
}
