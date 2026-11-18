// Controladores: reciben los datos, llaman a los servicios y devuelven la respuesta HTTP
const { ErrorValidacion, ErrorCredenciales, ErrorConflicto } = require('./errors');
const { TIPOS, validarFechaTurno, leerId } = require('./utilidades');

const TREINTA_DIAS = 30 * 24 * 60 * 60 * 1000;
const TURNOS = [
  { valor: 'manana', texto: 'Mañana' },
  { valor: 'tarde', texto: 'Tarde' }
];

// deja solo los campos sin error (son los que se conservan en el formulario)
function valoresValidos(datos, errores) {
  const valores = {};
  ['equipoId', 'fecha', 'turno'].forEach((campo) => {
    if (!errores[campo] && typeof datos[campo] === 'string') valores[campo] = datos[campo];
  });
  return valores;
}

module.exports = (servicios) => {
  // modelo de vista del formulario de reservas
  function crearModelo(valores, errores) {
    const mostrarEquipos = Boolean(valores.fecha && valores.turno);
    return {
      valores,
      errores,
      turnos: TURNOS,
      mostrarEquipos,
      equiposDisponibles: mostrarEquipos ? servicios.reservas.equiposDisponibles(valores.fecha, valores.turno) : []
    };
  }

  function mostrarAdminEquipos(res, status, errores, valores) {
    res.status(status).render('admin/equipos', {
      titulo: 'Administrar equipos',
      equipos: servicios.equipos.listar(),
      errores,
      valores
    });
  }

  return {
    // ---------- EQUIPOS ----------
    listarEquipos(req, res) {
      let tipo = req.query.tipo;
      if (tipo === 'todos') {
        res.clearCookie('tipoPreferido'); // el usuario quiere ver todos
        tipo = undefined;
      } else if (TIPOS.includes(tipo)) {
        res.cookie('tipoPreferido', tipo, { httpOnly: true, sameSite: 'lax', maxAge: TREINTA_DIAS });
      } else {
        // sin filtro en la URL: se usa la cookie (solo si su valor es válido)
        const guardado = req.cookies.tipoPreferido;
        tipo = TIPOS.includes(guardado) ? guardado : undefined;
      }
      const operativos = req.query.operativos === 'true';
      const equipos = servicios.equipos.listar({ tipo, operativos });
      res.render('equipos/lista', { titulo: 'Equipos', equipos, filtros: { tipo, operativos } });
    },

    fichaEquipo(req, res) {
      const equipo = servicios.equipos.obtener(leerId(req.params.id));
      res.render('equipos/ficha', { titulo: equipo.nombre, equipo });
    },

    // ---------- REGISTRO, LOGIN, PERFIL ----------
    formRegistro(req, res) {
      res.render('auth/registro', { titulo: 'Registro', errores: {}, valores: {} });
    },

    async registro(req, res, next) {
      const datos = req.body || {};
      try {
        await servicios.usuarios.registrar(datos);
        req.session.mensaje = 'Registro completado. Ya puedes iniciar sesión.';
        res.redirect(303, '/login');
      } catch (err) {
        if (!(err instanceof ErrorValidacion)) return next(err);
        const valores = { nombre: datos.nombre, email: datos.email }; // la contraseña no se devuelve
        res.status(400).render('auth/registro', { titulo: 'Registro', errores: err.errores, valores });
      }
    },

    formLogin(req, res) {
      res.render('auth/login', { titulo: 'Iniciar sesión', errores: {}, valores: {} });
    },

    async login(req, res, next) {
      const datos = req.body || {};
      try {
        const usuario = await servicios.usuarios.autenticar(datos.email, datos.password);
        // sesión nueva, y se guarda SOLO el id del usuario
        req.session.regenerate((err) => {
          if (err) return next(err);
          req.session.usuarioId = usuario.id;
          req.session.mensaje = 'Sesión iniciada';
          res.redirect(303, '/perfil');
        });
      } catch (err) {
        if (!(err instanceof ErrorCredenciales)) return next(err);
        res.status(401).render('auth/login', {
          titulo: 'Iniciar sesión',
          errores: { login: err.message },
          valores: { email: datos.email }
        });
      }
    },

    logout(req, res, next) {
      // destruye la sesión del servidor y borra la cookie
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('sid');
        res.redirect(303, '/login');
      });
    },

    perfil(req, res) {
      res.render('auth/perfil', { titulo: 'Mi perfil' });
    },

    // ---------- RESERVAS ----------
    formularioReserva(req, res) {
      const { fecha, turno } = req.query;
      const hayDatos = fecha !== undefined || turno !== undefined;
      const errores = hayDatos ? validarFechaTurno(fecha, turno) : {};
      const valores = valoresValidos({ fecha, turno }, errores);
      const status = Object.keys(errores).length > 0 ? 400 : 200;
      res.status(status).render('reservas/nueva', { titulo: 'Nueva reserva', modelo: crearModelo(valores, errores) });
    },

    crearReserva(req, res) {
      const datos = req.body || {};
      try {
        // el usuario sale de la sesión, nunca del formulario
        servicios.reservas.crear(req.usuario.id, datos);
        req.session.mensaje = 'Reserva realizada correctamente';
        res.redirect(303, '/mis-reservas'); // Post/Redirect/Get
      } catch (err) {
        if (!(err instanceof ErrorValidacion || err instanceof ErrorConflicto)) throw err;
        const errores = err.errores || { conflicto: err.message };
        res.status(err.status).render('reservas/nueva', {
          titulo: 'Nueva reserva',
          modelo: crearModelo(valoresValidos(datos, errores), errores)
        });
      }
    },

    misReservas(req, res) {
      const reservas = servicios.reservas.listarDeUsuario(req.usuario.id);
      res.render('reservas/mis-reservas', { titulo: 'Mis reservas', reservas });
    },

    cancelarReserva(req, res) {
      servicios.reservas.cancelarPropia(leerId(req.params.id), req.usuario.id);
      req.session.mensaje = 'Reserva cancelada';
      res.redirect(303, '/mis-reservas');
    },

    // ---------- ADMINISTRACIÓN ----------
    adminEquipos(req, res) {
      mostrarAdminEquipos(res, 200, {}, {});
    },

    adminCrearEquipo(req, res) {
      const datos = req.body || {};
      try {
        servicios.equipos.crear(datos);
        req.session.mensaje = 'Equipo añadido';
        res.redirect(303, '/admin/equipos');
      } catch (err) {
        if (!(err instanceof ErrorValidacion)) throw err;
        mostrarAdminEquipos(res, 400, err.errores, datos);
      }
    },

    adminCambiarEstado(req, res) {
      const datos = req.body || {};
      servicios.equipos.cambiarEstado(leerId(req.params.id), datos.estado);
      req.session.mensaje = 'Estado del equipo actualizado';
      res.redirect(303, '/admin/equipos');
    },

    adminReservas(req, res) {
      res.render('admin/reservas', { titulo: 'Todas las reservas', reservas: servicios.reservas.listarTodas() });
    },

    adminCancelarReserva(req, res) {
      servicios.reservas.cancelarComoAdmin(leerId(req.params.id));
      req.session.mensaje = 'Reserva cancelada';
      res.redirect(303, '/admin/reservas');
    }
  };
};
