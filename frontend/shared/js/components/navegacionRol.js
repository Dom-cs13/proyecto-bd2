/**
 * Navegación y permisos visuales por rol institucional (I4-10)
 * Soporta sesión real por JWT o selector de vista previa en localhost.
 */
import { obtenerSesion } from '../api/auth.js';

const CLAVE_ROL_DEMO = 'alba_rol_demo';

export const ROLES_DISPONIBLES = {
  pediatra: {
    id: 'pediatra',
    etiqueta: 'Pediatra / Médico',
    vistasPermitidas: ['principal', 'buscador', 'crecimiento', 'gestion', 'consulta-red'],
    accionesPermitidas: ['crear_paciente', 'archivar_paciente', 'registrar_consulta', 'registrar_crecimiento', 'registrar_vacuna', 'consultar_red']
  },
  enfermeria: {
    id: 'enfermeria',
    etiqueta: 'Enfermería Pediátrica',
    vistasPermitidas: ['principal', 'buscador', 'crecimiento', 'consulta-red'],
    accionesPermitidas: ['registrar_crecimiento', 'registrar_vacuna', 'consultar_red']
  },
  recepcion: {
    id: 'recepcion',
    etiqueta: 'Recepción / Admisión',
    vistasPermitidas: ['principal', 'buscador', 'gestion'],
    accionesPermitidas: ['crear_paciente', 'archivar_paciente']
  }
};

export function obtenerRolActivo() {
  const sesion = obtenerSesion();
  if (sesion?.rol && ROLES_DISPONIBLES[sesion.rol]) {
    return sesion.rol;
  }
  const guardado = sessionStorage.getItem(CLAVE_ROL_DEMO);
  if (guardado && ROLES_DISPONIBLES[guardado]) {
    return guardado;
  }
  return 'pediatra';
}

export function establecerRolDemo(nuevoRol) {
  if (ROLES_DISPONIBLES[nuevoRol]) {
    sessionStorage.setItem(CLAVE_ROL_DEMO, nuevoRol);
  }
  return obtenerRolActivo();
}

export function obtenerConfiguracionRol(rol = obtenerRolActivo()) {
  return ROLES_DISPONIBLES[rol] || ROLES_DISPONIBLES.pediatra;
}

export function puedeAccederVista(nombreVista, rol = obtenerRolActivo()) {
  const cfg = obtenerConfiguracionRol(rol);
  return cfg.vistasPermitidas.includes(nombreVista);
}

export function puedeEjecutarAccion(accion, rol = obtenerRolActivo()) {
  const cfg = obtenerConfiguracionRol(rol);
  return cfg.accionesPermitidas.includes(accion);
}
