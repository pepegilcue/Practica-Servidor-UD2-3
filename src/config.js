// Lee las variables de entorno y las valida al arrancar.
require('dotenv').config();

const ENTORNOS = ['development', 'production', 'test'];
const errores = [];

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  errores.push('PORT debe ser un número entero entre 1 y 65535');
}

const nodeEnv = process.env.NODE_ENV;
if (!ENTORNOS.includes(nodeEnv)) {
  errores.push('NODE_ENV debe ser development, production o test');
}

const sessionSecret = process.env.SESSION_SECRET;
if (typeof sessionSecret !== 'string' || sessionSecret.length < 16) {
  errores.push('SESSION_SECRET debe tener al menos 16 caracteres');
}

if (errores.length > 0) {
  throw new Error('Configuración incorrecta:\n- ' + errores.join('\n- '));
}

module.exports = { port, nodeEnv, sessionSecret };
