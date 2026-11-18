// Datos iniciales en memoria. Cada llamada devuelve datos nuevos.
const bcrypt = require('bcrypt');

// Los hashes se generan una sola vez al cargar el módulo.
const hashAdmin = bcrypt.hashSync('admin1234', 10);
const hashAna = bcrypt.hashSync('ana12345', 10);
const hashLuis = bcrypt.hashSync('luis12345', 10);

function datosIniciales() {
  const equipos = [
    { id: 1, codigo: 'PC-001', nombre: 'Ordenador aula 1', tipo: 'sobremesa', estado: 'operativo' },
    { id: 2, codigo: 'PORT-001', nombre: 'Portátil Lenovo', tipo: 'portatil', estado: 'operativo' },
    { id: 3, codigo: 'PC-002', nombre: 'Ordenador aula 2', tipo: 'sobremesa', estado: 'fuera_de_servicio' }
  ];

  const reservas = [
    { id: 1, equipoId: 1, usuarioId: 2, fecha: '2027-01-15', turno: 'manana', estado: 'activa' },
    { id: 2, equipoId: 2, usuarioId: 3, fecha: '2027-01-15', turno: 'tarde', estado: 'activa' },
    { id: 3, equipoId: 1, usuarioId: 2, fecha: '2027-01-16', turno: 'manana', estado: 'cancelada' }
  ];

  const usuarios = [
    { id: 1, nombre: 'Administrador', email: 'admin@example.com', passwordHash: hashAdmin, rol: 'admin' },
    { id: 2, nombre: 'Ana García', email: 'ana@example.com', passwordHash: hashAna, rol: 'usuario' },
    { id: 3, nombre: 'Luis Pérez', email: 'luis@example.com', passwordHash: hashLuis, rol: 'usuario' }
  ];

  return { equipos, reservas, usuarios };
}

module.exports = { datosIniciales };
