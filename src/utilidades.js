// Constantes y funciones sencillas (no dependen de req ni de res)
const { ErrorValidacion } = require('./errors');

const TIPOS = ['sobremesa', 'portatil'];
const ESTADOS_EQUIPO = ['operativo', 'fuera_de_servicio'];
const TURNOS = ['manana', 'tarde'];

function hoy() {
  return new Date().toISOString().slice(0, 10); // AAAA-MM-DD
}

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(fecha + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === fecha;
}

// true si ya hay una reserva ACTIVA para ese equipo, fecha y turno
function estaReservado(equipoId, fecha, turno, reservas) {
  return reservas.some(
    (r) => r.equipoId === equipoId && r.fecha === fecha && r.turno === turno && r.estado === 'activa'
  );
}

// equipos operativos y no reservados para esa fecha y turno
function obtenerEquiposDisponibles(equipos, reservas, fecha, turno) {
  return equipos.filter((e) => e.estado === 'operativo' && !estaReservado(e.id, fecha, turno, reservas));
}

function validarFechaTurno(fecha, turno) {
  const errores = {};
  if (!fechaValida(fecha)) errores.fecha = 'La fecha no es válida (formato AAAA-MM-DD)';
  else if (fecha < hoy()) errores.fecha = 'La fecha no puede ser anterior a hoy';
  if (!TURNOS.includes(turno)) errores.turno = 'El turno debe ser mañana o tarde';
  return errores;
}

// devuelve { campo: 'mensaje' } (vacío si todo está bien)
function validarReserva(datos) {
  const errores = validarFechaTurno(datos.fecha, datos.turno);
  if (typeof datos.equipoId !== 'string' || !/^\d+$/.test(datos.equipoId) || Number(datos.equipoId) < 1) {
    errores.equipoId = 'El equipo no es válido';
  }
  return errores;
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// convierte req.params.id en número; si no es válido lanza 400
function leerId(valor) {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || Number(valor) < 1) {
    throw new ErrorValidacion({ id: 'El identificador no es válido' });
  }
  return Number(valor);
}

module.exports = {
  TIPOS, ESTADOS_EQUIPO, TURNOS,
  hoy, estaReservado, obtenerEquiposDisponibles, validarFechaTurno, validarReserva, texto, leerId
};
