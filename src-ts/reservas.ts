// ---------- Tipos unión ----------
export type Rol = 'usuario' | 'admin';
export type Turno = 'manana' | 'tarde';
export type EstadoReserva = 'activa' | 'cancelada';
export type TipoEquipo = 'sobremesa' | 'portatil';
export type EstadoEquipo = 'operativo' | 'fuera_de_servicio';

// ---------- Interfaces ----------
export interface Equipo {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoEquipo;
  estado: EstadoEquipo;
}

export interface Reserva {
  id: number;
  equipoId: number;
  usuarioId: number;
  fecha: string; // AAAA-MM-DD
  turno: Turno;
  estado: EstadoReserva;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}

// datos para crear una reserva (el id y el estado los pone el repositorio)
export interface NuevaReserva {
  equipoId: number;
  usuarioId: number;
  fecha: string;
  turno: Turno;
}

// ---------- Repositorio ----------
export interface RepositorioReservas {
  listar(): Reserva[];
  buscarPorId(id: number): Reserva | undefined;
  crear(datos: NuevaReserva): Reserva;
  actualizarEstado(id: number, estado: EstadoReserva): Reserva | undefined;
}

// implementación en memoria con Map (clave: id de la reserva)
export class RepositorioReservasMemoria implements RepositorioReservas {
  private reservas: Map<number, Reserva> = new Map();
  private siguienteId: number = 1;

  listar(): Reserva[] {
    return Array.from(this.reservas.values());
  }

  buscarPorId(id: number): Reserva | undefined {
    return this.reservas.get(id);
  }

  crear(datos: NuevaReserva): Reserva {
    const reserva: Reserva = { id: this.siguienteId++, ...datos, estado: 'activa' };
    this.reservas.set(reserva.id, reserva);
    return reserva;
  }

  actualizarEstado(id: number, estado: EstadoReserva): Reserva | undefined {
    const reserva = this.reservas.get(id);
    if (reserva) {
      reserva.estado = estado;
    }
    return reserva;
  }
}

// ---------- Servicio (el repositorio llega por el constructor) ----------
export class ServicioReservas {
  constructor(private repositorio: RepositorioReservas) {}

  estaReservado(equipoId: number, fecha: string, turno: Turno): boolean {
    return this.repositorio
      .listar()
      .some((r) => r.equipoId === equipoId && r.fecha === fecha && r.turno === turno && r.estado === 'activa');
  }

  crear(datos: NuevaReserva): Reserva {
    if (this.estaReservado(datos.equipoId, datos.fecha, datos.turno)) {
      throw new Error('El equipo ya está reservado para esa fecha y turno');
    }
    return this.repositorio.crear(datos);
  }

  listarDeUsuario(usuarioId: number): Reserva[] {
    return this.repositorio.listar().filter((r) => r.usuarioId === usuarioId);
  }

  cancelar(id: number, usuarioId: number): Reserva {
    const reserva = this.repositorio.buscarPorId(id);
    if (!reserva) throw new Error('La reserva no existe');
    if (reserva.usuarioId !== usuarioId) throw new Error('No puedes cancelar una reserva de otro usuario');
    if (reserva.estado !== 'activa') throw new Error('La reserva ya está cancelada');
    const actualizada = this.repositorio.actualizarEstado(id, 'cancelada');
    if (!actualizada) throw new Error('La reserva no existe');
    return actualizada;
  }
}
