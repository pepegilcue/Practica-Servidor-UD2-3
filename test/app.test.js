import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';

// Usuarios de prueba (definidos en src/datos.js)
const ADMIN = { email: 'admin@example.com', password: 'admin1234' };
const ANA = { email: 'ana@example.com', password: 'ana12345' };
const LUIS = { email: 'luis@example.com', password: 'luis12345' };

// Lee el token CSRF de una página
async function obtenerToken(agente, ruta) {
  const res = await agente.get(ruta);
  const coincidencia = /name="_csrf" value="([^"]+)"/.exec(res.text);
  return coincidencia[1];
}

// Inicia sesión con un agente (que conserva las cookies)
async function iniciarSesion(agente, usuario) {
  const token = await obtenerToken(agente, '/login');
  return agente.post('/login').type('form').send({ _csrf: token, ...usuario });
}

describe('Aplicación de reserva de equipos', () => {
  let app;
  let agente;

  beforeEach(() => {
    app = crearApp(); // datos nuevos en cada prueba
    agente = request.agent(app);
  });

  it('1. registra un usuario válido', async () => {
    const token = await obtenerToken(agente, '/registro');
    const res = await agente
      .post('/registro')
      .type('form')
      .send({ _csrf: token, nombre: 'Pepe', email: 'pepe@example.com', password: 'clave12345' });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');

    // Y ya puede iniciar sesión con esa cuenta
    const login = await iniciarSesion(agente, { email: 'pepe@example.com', password: 'clave12345' });
    expect(login.status).toBe(303);
  });

  it('2. rechaza credenciales incorrectas', async () => {
    const res = await iniciarSesion(agente, { email: ANA.email, password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('3. impide acceder a una ruta privada sin autenticación', async () => {
    const res = await agente.get('/perfil');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');
  });

  it('4. permite acceder a una ruta privada con sesión', async () => {
    await iniciarSesion(agente, ANA);
    const res = await agente.get('/perfil');
    expect(res.status).toBe(200);
    expect(res.text).toContain(ANA.email);
  });

  it('5. rechaza una operación de administrador hecha por un usuario ordinario', async () => {
    await iniciarSesion(agente, ANA);
    const token = await obtenerToken(agente, '/perfil');
    const res = await agente
      .post('/admin/equipos/1/estado')
      .type('form')
      .send({ _csrf: token, estado: 'fuera_de_servicio' });
    expect(res.status).toBe(403);
  });

  it('6. crea una reserva válida de un equipo disponible', async () => {
    await iniciarSesion(agente, ANA);
    const token = await obtenerToken(agente, '/perfil');
    const res = await agente
      .post('/reservas')
      .type('form')
      .send({ _csrf: token, equipoId: '2', fecha: '2027-01-15', turno: 'manana' });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/mis-reservas');

    const lista = await agente.get('/mis-reservas');
    expect(lista.text).toContain('Portátil Lenovo');
  });

  it('7. rechaza una reserva duplicada para el mismo equipo, fecha y turno', async () => {
    // En los datos iniciales el equipo 1 ya está reservado el 2027-01-15 por la mañana
    await iniciarSesion(agente, LUIS);
    const token = await obtenerToken(agente, '/perfil');
    const res = await agente
      .post('/reservas')
      .type('form')
      .send({ _csrf: token, equipoId: '1', fecha: '2027-01-15', turno: 'manana' });
    expect(res.status).toBe(409);
  });

  it('8. rechaza la cancelación de una reserva ajena', async () => {
    // La reserva 1 es de Ana; Luis intenta cancelarla
    await iniciarSesion(agente, LUIS);
    const token = await obtenerToken(agente, '/perfil');
    const res = await agente.post('/reservas/1/cancelar').type('form').send({ _csrf: token });
    expect(res.status).toBe(403);
  });

  it('9. rechaza un cambio de estado sin token CSRF válido', async () => {
    await iniciarSesion(agente, ADMIN);
    const res = await agente
      .post('/admin/equipos/1/estado')
      .type('form')
      .send({ estado: 'fuera_de_servicio' }); // sin _csrf
    expect(res.status).toBe(403);
  });

  it('10. invalida la sesión después del logout', async () => {
    await iniciarSesion(agente, ANA);
    expect((await agente.get('/perfil')).status).toBe(200);

    const token = await obtenerToken(agente, '/perfil');
    const logout = await agente.post('/logout').type('form').send({ _csrf: token });
    expect(logout.status).toBe(303);

    const res = await agente.get('/perfil');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');
  });
});
