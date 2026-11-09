import { apiClient } from './client.js';
import { obtenerSesion, cerrarSesion } from './auth.js';

// Cliente institucional: no cambia los clientes de otros módulos.
export function crearApiOdontologia({ cliente = apiClient, sesion = obtenerSesion, alExpirar = cerrarSesion } = {}) {
  async function solicitar(ruta, { method = 'GET', datos, signal } = {}) {
    const actual = sesion();
    if (!actual || actual.institucion !== 'odontologia') {
      throw Object.assign(new Error('Inicia sesión en Odontología para continuar'), { status: 401 });
    }
    const respuesta = await cliente(ruta, {
      method, signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${actual.token}` },
      ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
    });
    const cuerpo = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      if (respuesta.status === 401) alExpirar();
      throw Object.assign(new Error(cuerpo?.error?.mensaje ?? `Error HTTP ${respuesta.status}`), {
        status: respuesta.status, codigo: cuerpo?.error?.codigo,
      });
    }
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) throw new Error('La API devolvió una respuesta inválida');
    return cuerpo;
  }
  const id = (valor) => {
    if (!/^[1-9]\d{0,9}$/.test(String(valor)) || Number(valor) > 2147483647) throw new Error('Selecciona un identificador válido');
    return encodeURIComponent(valor);
  };
  return {
    buscarEnRed: (filtro, signal) => solicitar(`/red/pacientes?${new URLSearchParams(Object.entries(filtro).filter(([,v]) => v !== '' && v !== undefined))}`, { signal }),
    historialEnRed: (institucion, valor, signal) => {
      if (!['hospital', 'odontologia', 'laboratorio', 'pediatria'].includes(institucion) || !/^[A-Za-z0-9_-]{1,128}$/.test(String(valor))) throw new Error('Selecciona un expediente de red válido');
      return solicitar(`/red/${institucion}/pacientes/${encodeURIComponent(valor)}/historial`, { signal });
    },
    actualizarContacto: (valor, datos) => solicitar(`/odontologia/pacientes/${id(valor)}/contacto`, { method: 'PATCH', datos }),
    agenda: (fecha, signal) => solicitar(`/odontologia/agenda?${new URLSearchParams({ fecha })}`, { signal }),
    equipo: (signal) => solicitar('/odontologia/equipo', { signal }),
    crearCita: (datos) => solicitar('/odontologia/citas', { method: 'POST', datos }),
    cambiarCita: (valor, datos) => solicitar(`/odontologia/citas/${id(valor)}`, { method: 'PATCH', datos }),
    responsables: (valor, signal) => solicitar(`/odontologia/pacientes/${id(valor)}/responsables`, { signal }),
    responsable: (valor, datos) => solicitar(`/odontologia/pacientes/${id(valor)}/responsables`, { method: 'POST', datos }),
    alergias: (valor, signal) => solicitar(`/odontologia/pacientes/${id(valor)}/alergias`, { signal }),
    alergia: (valor, datos) => solicitar(`/odontologia/pacientes/${id(valor)}/alergias`, { method: 'POST', datos }),
    finalizar: (valor) => solicitar(`/odontologia/consultas/${id(valor)}/finalizar`, { method: 'PATCH', datos: {} }),
    listar: (filtro = {}, signal) => solicitar(`/pacientes?${new URLSearchParams(Object.entries(filtro)
      .filter(([, valor]) => valor !== '' && valor !== undefined))}`, { signal }),
    registrar: (datos) => solicitar('/pacientes', { method: 'POST', datos }),
    paciente: (valor, signal) => solicitar(`/pacientes/${id(valor)}`, { signal }),
    historial: (valor, signal) => solicitar(`/pacientes/${id(valor)}/historial`, { signal }),
    archivar: (valor, motivo) => solicitar(`/pacientes/${id(valor)}/archivar`, { method: 'PATCH', datos: { motivo } }),
    consulta: (datos) => solicitar('/consultas', { method: 'POST', datos }),
    diagnostico: (valor, datos) => solicitar(`/consultas/${id(valor)}/diagnosticos`, { method: 'POST', datos }),
    tratamiento: (valor, datos) => solicitar(`/diagnosticos/${id(valor)}/tratamientos`, { method: 'POST', datos }),
    receta: (valor, datos) => solicitar(`/consultas/${id(valor)}/recetas`, { method: 'POST', datos }),
    catalogos: (signal) => solicitar('/odontologia/catalogos', { signal }),
    estado: (signal) => solicitar('/odontologia/status', { signal }),
  };
}

export const apiOdontologia = crearApiOdontologia();
