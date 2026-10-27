// Formato de error único: { error: { codigo, mensaje } } con 400, 401/403, 404, 409 y 503.
import { ErrorDominio } from '../../../domain/errores.js';

export function noEncontrado(req, res) {
  res.status(404).json({ error: { codigo: 'RUTA_NO_EXISTE', mensaje: `No existe ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars -- Express reconoce el handler de errores por sus 4 parámetros
export function errorHandler(err, req, res, next) {
  if (err instanceof ErrorDominio) {
    return res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message } });
  }
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: err.issues.map((i) => i.message).join('; ') } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo no es JSON válido' } });
  }
  console.error(err);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' } });
}
