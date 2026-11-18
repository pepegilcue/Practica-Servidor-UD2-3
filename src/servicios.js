// Servicios: reglas de negocio. No usan req, res ni EJS.
const bcrypt = require('bcrypt');
const {
  ErrorValidacion, ErrorCredenciales, ErrorPermisos, ErrorNoEncontrado, ErrorConflicto
} = require('./errors');
const {
  TIPOS, ESTADOS_EQUIPO, hoy, estaReservado, obtenerEquiposDisponibles, validarReserva, texto
} = require('./utilidades');

class ServicioEquipos {
  constructor(repoEquipos) {
    this.repoEquipos = repoEquipos;
  }

  listar(filtros = {}) {
    let equipos = this.repoEquipos.listar();
    if (filtros.tipo) equipos = equipos.filter((e) => e.tipo === filtros.tipo);
    if (filtros.operativos) equipos = equipos.filter((e) => e.estado === 'operativo');
    return equipos;
  }

  obtener(id) {
    const equipo = this.repoEquipos.buscarPorId(id);
    if (!equipo) throw new ErrorNoEncontrado('El equipo no existe');
    return equipo;
  }

  crear(datos) {
    const codigo = texto(datos.codigo);
    const nombre = texto(datos.nombre);
    const errores = {};
    if (!codigo) errores.codigo = 'El código es obligatorio';
    if (!nombre) errores.nombre = 'El nombre es obligatorio';
    if (!TIPOS.includes(datos.tipo)) errores.tipo = 'El tipo debe ser sobremesa o portátil';
    if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores);
    return this.repoEquipos.crear({ codigo, nombre, tipo: datos.tipo, estado: 'operativo' });
  }

  cambiarEstado(id, estado) {
    if (!ESTADOS_EQUIPO.includes(estado)) throw new ErrorValidacion({ estado: 'El estado no es válido' });
    this.obtener(id); // lanza 404 si no existe
    return this.repoEquipos.actualizarEstado(id, estado);
  }
}

class ServicioUsuarios {
  constructor(repoUsuarios) {
    this.repoUsuarios = repoUsuarios;
  }

  async registrar(datos) {
    const nombre = texto(datos.nombre);
    const email = texto(datos.email).toLowerCase();
    const password = typeof datos.password === 'string' ? datos.password : '';

    const errores = {};
    if (!nombre) errores.nombre = 'El nombre es obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.email = 'El correo no es válido';
    if (password.length < 8) errores.password = 'La contraseña debe tener al menos 8 caracteres';
    if (!errores.email && this.repoUsuarios.buscarPorEmail(email)) errores.email = 'Ese correo ya está registrado';
    if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores);

    const passwordHash = await bcrypt.hash(password, 10);
    // el registro público SIEMPRE crea rol "usuario"
    return this.repoUsuarios.crear({ nombre, email, passwordHash, rol: 'usuario' });
  }

  async autenticar(email, password) {
    const usuario = this.repoUsuarios.buscarPorEmail(texto(email).toLowerCase());
    const correcto = usuario && typeof password === 'string' && (await bcrypt.compare(password, usuario.passwordHash));
    // mismo error si falla el correo o la contraseña
    if (!correcto) throw new ErrorCredenciales();
    return usuario;
  }
}

class ServicioReservas {
  constructor(repoReservas, repoEquipos, repoUsuarios) {
    this.repoReservas = repoReservas;
    this.repoEquipos = repoEquipos;
    this.repoUsuarios = repoUsuarios;
  }

  equiposDisponibles(fecha, turno) {
    return obtenerEquiposDisponibles(this.repoEquipos.listar(), this.repoReservas.listar(), fecha, turno);
  }

  crear(usuarioId, datos) {
    const errores = validarReserva(datos);
    if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores);

    const equipoId = Number(datos.equipoId);
    const equipo = this.repoEquipos.buscarPorId(equipoId);
    if (!equipo) throw new ErrorNoEncontrado('El equipo no existe');
    if (equipo.estado !== 'operativo') throw new ErrorValidacion({ equipoId: 'El equipo no está operativo' });
    if (estaReservado(equipoId, datos.fecha, datos.turno, this.repoReservas.listar())) {
      throw new ErrorConflicto('El equipo ya está reservado para esa fecha y turno');
    }
    return this.repoReservas.crear({ equipoId, usuarioId, fecha: datos.fecha, turno: datos.turno, estado: 'activa' });
  }

  // añade el nombre del equipo y del usuario a cada reserva (para las vistas)
  detalle(reservas) {
    return reservas.map((r) => {
      const equipo = this.repoEquipos.buscarPorId(r.equipoId);
      const usuario = this.repoUsuarios.buscarPorId(r.usuarioId);
      return {
        ...r,
        equipoNombre: equipo ? equipo.nombre : 'Equipo desconocido',
        usuarioNombre: usuario ? usuario.nombre : 'Usuario desconocido'
      };
    });
  }

  listarDeUsuario(usuarioId) { return this.detalle(this.repoReservas.listarPorUsuario(usuarioId)); }
  listarTodas() { return this.detalle(this.repoReservas.listar()); }

  obtener(id) {
    const reserva = this.repoReservas.buscarPorId(id);
    if (!reserva) throw new ErrorNoEncontrado('La reserva no existe');
    return reserva;
  }

  // un usuario solo cancela SUS reservas activas y de fecha no pasada
  cancelarPropia(id, usuarioId) {
    const reserva = this.obtener(id);
    if (reserva.usuarioId !== usuarioId) throw new ErrorPermisos('No puedes cancelar una reserva de otro usuario');
    if (reserva.estado !== 'activa') throw new ErrorValidacion({ estado: 'La reserva ya está cancelada' });
    if (reserva.fecha < hoy()) throw new ErrorValidacion({ fecha: 'No se puede cancelar una reserva pasada' });
    return this.repoReservas.actualizarEstado(id, 'cancelada');
  }

  // el administrador cancela cualquier reserva activa
  cancelarComoAdmin(id) {
    const reserva = this.obtener(id);
    if (reserva.estado !== 'activa') throw new ErrorValidacion({ estado: 'La reserva ya está cancelada' });
    return this.repoReservas.actualizarEstado(id, 'cancelada');
  }
}

module.exports = { ServicioEquipos, ServicioUsuarios, ServicioReservas };
