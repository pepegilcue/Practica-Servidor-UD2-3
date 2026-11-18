// Repositorios: único sitio donde se toca la lista de datos en memoria
class RepositorioEquipos {
  constructor(equipos) {
    this.equipos = equipos;
    this.siguienteId = Math.max(0, ...equipos.map((e) => e.id)) + 1;
  }
  listar() { return [...this.equipos]; }
  buscarPorId(id) { return this.equipos.find((e) => e.id === id); }
  crear(datos) {
    const equipo = { id: this.siguienteId++, ...datos };
    this.equipos.push(equipo);
    return equipo;
  }
  actualizarEstado(id, estado) {
    const equipo = this.buscarPorId(id);
    equipo.estado = estado;
    return equipo;
  }
}

class RepositorioReservas {
  constructor(reservas) {
    this.reservas = reservas;
    this.siguienteId = Math.max(0, ...reservas.map((r) => r.id)) + 1;
  }
  listar() { return [...this.reservas]; }
  listarPorUsuario(usuarioId) { return this.reservas.filter((r) => r.usuarioId === usuarioId); }
  buscarPorId(id) { return this.reservas.find((r) => r.id === id); }
  crear(datos) {
    const reserva = { id: this.siguienteId++, ...datos };
    this.reservas.push(reserva);
    return reserva;
  }
  // cancelar = cambiar el estado (nunca se borra)
  actualizarEstado(id, estado) {
    const reserva = this.buscarPorId(id);
    reserva.estado = estado;
    return reserva;
  }
}

class RepositorioUsuarios {
  constructor(usuarios) {
    this.usuarios = usuarios;
    this.siguienteId = Math.max(0, ...usuarios.map((u) => u.id)) + 1;
  }
  buscarPorId(id) { return this.usuarios.find((u) => u.id === id); }
  buscarPorEmail(email) { return this.usuarios.find((u) => u.email === email); }
  crear(datos) {
    const usuario = { id: this.siguienteId++, ...datos };
    this.usuarios.push(usuario);
    return usuario;
  }
}

module.exports = { RepositorioEquipos, RepositorioReservas, RepositorioUsuarios };
