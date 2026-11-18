// Rutas: solo definen método HTTP, URL y middleware
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { requiereLogin, requiereRol } = require('./middleware');

module.exports = (c) => {
  const router = express.Router();

  // máximo 5 intentos fallidos de login cada 15 minutos
  const limitarLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === 'test' ? 1000 : 5,
    skipSuccessfulRequests: true,
    message: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.'
  });

  // equipos (públicas)
  router.get('/', (req, res) => res.redirect(303, '/equipos'));
  router.get('/equipos', c.listarEquipos);
  router.get('/equipos/:id', c.fichaEquipo);

  // registro y autenticación
  router.get('/registro', c.formRegistro);
  router.post('/registro', c.registro);
  router.get('/login', c.formLogin);
  router.post('/login', limitarLogin, c.login);
  router.post('/logout', c.logout);
  router.get('/perfil', requiereLogin, c.perfil);

  // reservas (hay que estar autenticado)
  router.get('/reservas/nueva', requiereLogin, c.formularioReserva);
  router.post('/reservas', requiereLogin, c.crearReserva);
  router.get('/mis-reservas', requiereLogin, c.misReservas);
  router.post('/reservas/:id/cancelar', requiereLogin, c.cancelarReserva);

  // administración (autenticado + rol admin)
  router.use('/admin', requiereLogin, requiereRol('admin'));
  router.get('/admin/equipos', c.adminEquipos);
  router.post('/admin/equipos', c.adminCrearEquipo);
  router.post('/admin/equipos/:id/estado', c.adminCambiarEstado);
  router.get('/admin/reservas', c.adminReservas);
  router.post('/admin/reservas/:id/cancelar', c.adminCancelarReserva);

  return router;
};
