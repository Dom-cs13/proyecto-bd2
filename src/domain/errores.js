// Errores de dominio. El errorHandler los traduce al formato único { error: { codigo, mensaje } }.
export class ErrorDominio extends Error {
  constructor(codigo, mensaje, status) {
    super(mensaje ?? codigo);
    this.codigo = codigo;
    this.status = status;
  }
}

export class Validacion extends ErrorDominio {
  constructor(codigo = 'VALIDACION', mensaje) { super(codigo, mensaje, 400); }
}

export class NoAutenticado extends ErrorDominio {
  constructor(codigo = 'NO_AUTENTICADO', mensaje) { super(codigo, mensaje, 401); }
}

export class Prohibido extends ErrorDominio {
  constructor(codigo = 'PROHIBIDO', mensaje) { super(codigo, mensaje, 403); }
}

export class NoEncontrado extends ErrorDominio {
  constructor(codigo = 'NO_ENCONTRADO', mensaje) { super(codigo, mensaje, 404); }
}

export class Conflicto extends ErrorDominio {
  constructor(codigo = 'CONFLICTO', mensaje) { super(codigo, mensaje, 409); }
}

export class MotorNoDisponible extends ErrorDominio {
  constructor(institucion, mensaje = `El motor de ${institucion} no está disponible`) {
    super('MOTOR_NO_DISPONIBLE', mensaje, 503);
    this.institucion = institucion;
  }
}
