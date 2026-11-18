const crypto = require('crypto');
const { ErrorDominio, ErrorPermisos, ErrorNoEncontrado } = require('./errors');

// Carga el usuario a partir del id guardado en la sesión
function cargarUsuario(repoUsuarios) {
  return (req, res, next) => {
    const id = req.session.usuarioId;
    req.usuario = id ? repoUsuarios.buscarPorId(id) || null : null;
    res.locals.usuario = req.usuario;
    next();
  };
}

// Autenticación: sin usuario, redirige al login
function requiereLogin(req, res, next) {
  if (!req.usuario) return res.redirect(303, '/login');
  next();
}

// Autorización por rol (se usa después de requiereLogin)
function requiereRol(rol) {
  return (req, res, next) => {
    if (req.usuario.rol !== rol) return next(new ErrorPermisos());
    next();
  };
}

// CSRF: el token vive en la sesión y se envía en el campo oculto "_csrf" de cada POST
function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;

  if (req.method === 'POST') {
    const recibido = Buffer.from(String((req.body || {})._csrf || ''));
    const esperado = Buffer.from(req.session.csrfToken);
    if (recibido.length !== esperado.length || !crypto.timingSafeEqual(recibido, esperado)) {
      return next(new ErrorPermisos('Token CSRF no válido'));
    }
  }
  next();
}

function noEncontrado(req, res, next) {
  next(new ErrorNoEncontrado('Página no encontrada'));
}

// Errores centralizados: nunca se muestran trazas ni datos internos
function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = 500;
  let textoError = 'Error interno del servidor';
  if (err instanceof ErrorDominio) {
    status = err.status;
    textoError = err.errores ? Object.values(err.errores).join('. ') : err.message;
  } else {
    console.error(err);
  }
  res.status(status).render('error', { titulo: 'Error ' + status, textoError });
}

module.exports = { cargarUsuario, requiereLogin, requiereRol, csrf, noEncontrado, manejarErrores };
