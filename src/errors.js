// Errores de dominio: representan situaciones previstas.
class ErrorDominio extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ErrorValidacion extends ErrorDominio {
  // errores es un objeto { campo: 'mensaje' }
  constructor(errores) {
    super('Datos incorrectos', 400);
    this.errores = errores;
  }
}

class ErrorCredenciales extends ErrorDominio {
  constructor() {
    super('Correo o contraseña incorrectos', 401);
  }
}

class ErrorPermisos extends ErrorDominio {
  constructor(mensaje = 'No tienes permisos para esta operación') {
    super(mensaje, 403);
  }
}

class ErrorNoEncontrado extends ErrorDominio {
  constructor(mensaje = 'Recurso no encontrado') {
    super(mensaje, 404);
  }
}

class ErrorConflicto extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 409);
  }
}

module.exports = {
  ErrorDominio,
  ErrorValidacion,
  ErrorCredenciales,
  ErrorPermisos,
  ErrorNoEncontrado,
  ErrorConflicto
};
