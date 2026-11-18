const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { datosIniciales } = require('./datos');
const { RepositorioEquipos, RepositorioReservas, RepositorioUsuarios } = require('./repositorios');
const { ServicioEquipos, ServicioReservas, ServicioUsuarios } = require('./servicios');
const { cargarUsuario, csrf, noEncontrado, manejarErrores } = require('./middleware');
const crearControladores = require('./controladores');
const crearRutas = require('./rutas');

// Crea la aplicación con datos nuevos. server.js la arranca; las pruebas la usan directamente.
function crearApp() {
  const datos = datosIniciales();

  const repoEquipos = new RepositorioEquipos(datos.equipos);
  const repoReservas = new RepositorioReservas(datos.reservas);
  const repoUsuarios = new RepositorioUsuarios(datos.usuarios);

  const servicios = {
    equipos: new ServicioEquipos(repoEquipos),
    reservas: new ServicioReservas(repoReservas, repoEquipos, repoUsuarios),
    usuarios: new ServicioUsuarios(repoUsuarios)
  };

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(
    session({
      name: 'sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000 // 1 hora
      }
    })
  );

  // mensaje de confirmación de un solo uso: se lee y se borra de la sesión
  app.use((req, res, next) => {
    res.locals.mensaje = req.session.mensaje || null;
    delete req.session.mensaje;
    next();
  });

  app.use(csrf);
  app.use(cargarUsuario(repoUsuarios));
  app.use(crearRutas(crearControladores(servicios)));
  app.use(noEncontrado);
  app.use(manejarErrores);

  return app;
}

module.exports = { crearApp };
