function fechaISO(valor) {
  if (valor == null) return null;

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  return String(valor).slice(0, 10);
}

export const identificadorDental = (valor) => ({ id: String(valor) });
export const profesionalDesdeFila = (r) => ({ id: String(r.id_usuario), nombre: `${r.nombres} ${r.apellidos}` });
export const citaDesdeFila = (r) => ({ id: String(r.id_cita), pacienteId: String(r.id_paciente),
  usuarioId: String(r.id_usuario), nombre: `${r.nombres} ${r.apellidos}`, fecha: fechaISO(r.fecha),
  hora: String(r.hora).slice(0, 5), motivo: r.motivo, estado: r.estado });
export const responsableDesdeFila = (r) => ({ id: String(r.id_responsable), nombres: r.nombres,
  apellidos: r.apellidos, telefono: r.telefono, dpi: r.dpi, parentesco: r.parentesco, esPrincipal: r.es_principal });
export const alergiaDesdeFila = (r) => ({ id: String(r.id_alergia), nombre: r.nombre,
  nivelSeveridad: r.nivel_severidad, reaccion: r.reaccion, observaciones: r.observaciones });

export function pacienteDesdeFila(fila) {
  if (!fila) return null;

  return {
    id: String(fila.id_paciente),
    nombres: fila.nombres,
    nombre: fila.nombres,
    documentoIdentidad: fila.documento_identidad ?? null,
    genero: ['F', 'Femenino'].includes(fila.sexo) ? 'Femenino'
      : ['M', 'Masculino'].includes(fila.sexo) ? 'Masculino' : 'Otro',
    apellidos: fila.apellidos,
    fechaNacimiento: fechaISO(fila.fecha_nacimiento),
    sexo: fila.sexo,
    telefono: fila.telefono ?? '',
    correo: fila.correo ?? '',
    direccion: fila.direccion ?? '',
    activo: fila.activo !== false,
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

export function diagnosticoDesdeFila(fila) {
  return { id: String(fila.id_diagnostico), consultaId: String(fila.id_consulta),
    codigoCie: fila.codigo_cie ?? 'Z00.0',
    descripcion: fila.descripcion, observaciones: fila.observaciones ?? null };
}

export function tratamientoDesdeFila(fila) {
  return { id: String(fila.id_tratamiento), diagnosticoId: String(fila.id_diagnostico),
    descripcion: fila.descripcion, fechaInicio: fechaISO(fila.fecha_inicio),
    fechaFin: fechaISO(fila.fecha_fin), estado: fila.estado, observaciones: fila.observaciones ?? null };
}

export function recetaDesdeFila(fila) {
  return { id: String(fila.id_receta), consultaId: String(fila.id_consulta),
    fecha: fila.fecha?.toISOString?.() ?? fila.fecha,
    indicacionesGenerales: fila.indicaciones_generales ?? null };
}

export function medicamentoDesdeFila(fila) {
  return { id: String(fila.id_detalle_receta), medicamentoId: String(fila.id_medicamento),
    nombre: fila.nombre, dosis: fila.dosis, frecuencia: fila.frecuencia,
    duracion: fila.duracion ?? null, cantidad: fila.cantidad ?? null, indicaciones: fila.indicaciones ?? null };
}

export function servicioDesdeFila(fila) {
  return { id: String(fila.id_consulta_servicio), servicioId: String(fila.id_servicio),
    nombre: fila.nombre, piezaDental: fila.pieza_dental ?? null, superficie: fila.superficie ?? null,
    precioAplicado: fila.precio_aplicado == null ? null : Number(fila.precio_aplicado),
    observaciones: fila.observaciones ?? null };
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
