import { obtenerTodos as obtenerRegistrados } from './RepositoryFactory.js';
import { obtenerRepositorio as obtenerOdontologia } from './odontologiaRepositoryFactory.js';
import { obtenerRepositorio as obtenerPediatria } from './pediatriaRepositoryFactory.js';

// Compone fábricas existentes sin modificar su registro ni construir otros adaptadores.
// Resolución diferida: un motor sin configurar no impide consultar los restantes.
const lecturaLocal = (resolver, institucion) => ({
  listarPacientes: (filtro) => resolver(institucion).listarPacientes(filtro),
  obtenerHistorial: (id) => resolver(institucion).obtenerHistorial(id),
});

export function obtenerTodos() {
  return {
    odontologia: lecturaLocal(obtenerOdontologia, 'odontologia'),
    pediatria: lecturaLocal(obtenerPediatria, 'pediatria'),
    ...obtenerRegistrados(),
  };
}
