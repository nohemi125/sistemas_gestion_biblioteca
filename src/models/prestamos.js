const db = require('../config/db');

const Prestamo = {
  // Listar todos los préstamos con nombres y títulos
  async listar() {
    const [rows] = await db.query(`
      SELECT 
        p.id_prestamo,
        p.id_miembro,
        p.id_libro,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.estado,
        CONCAT(m.nombres, ' ', m.apellidos) AS nombre_miembro,
        l.titulo AS titulo_libro
      FROM prestamos p
      INNER JOIN miembros m ON m.id_miembro = p.id_miembro
      INNER JOIN libros l ON l.id_libro = p.id_libro
      ORDER BY p.id_prestamo DESC
    `);
    return rows;
  },

  async listarPorId(id) {
    const [rows] = await db.query(`
      SELECT 
        p.id_prestamo,
        p.id_miembro,
        p.id_libro,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.estado,
        CONCAT(m.nombres, ' ', m.apellidos) AS nombre_miembro,
        l.titulo AS titulo_libro
      FROM prestamos p
      INNER JOIN miembros m ON m.id_miembro = p.id_miembro
      INNER JOIN libros l ON l.id_libro = p.id_libro
      WHERE p.id_prestamo = ?
    `, [id]);
    return rows;
  },

  async buscar(filtro) {
    const busqueda = `%${filtro}%`;
    const [rows] = await db.query(`
      SELECT 
        p.id_prestamo,
        p.id_miembro,
        p.id_libro,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.estado,
        CONCAT(m.nombres, ' ', m.apellidos) AS nombre_miembro,
        l.titulo AS titulo_libro
      FROM prestamos p
      INNER JOIN miembros m ON m.id_miembro = p.id_miembro
      INNER JOIN libros l ON l.id_libro = p.id_libro
      WHERE 
        CONCAT(m.nombres, ' ', m.apellidos) LIKE ? OR
        l.titulo LIKE ? OR
        p.id_prestamo LIKE ?
      ORDER BY p.id_prestamo DESC
    `, [busqueda, busqueda, busqueda]);
    return rows;
  },

  async crear({ id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado = 'Activo' }) {
    const [result] = await db.query(
      `INSERT INTO prestamos (id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado]
    );
    return { id_prestamo: result.insertId, id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado };
  },

  async actualizar(id, datos) {
    const campos = [];
    const valores = [];
    const permitidos = ['id_miembro', 'id_libro', 'fecha_prestamo', 'fecha_devolucion', 'estado'];

    for (const k of permitidos) {
      if (datos[k] !== undefined) {
        campos.push(`${k} = ?`);
        valores.push(datos[k]);
      }
    }

    if (campos.length === 0) return;

    valores.push(id);
    await db.query(`UPDATE prestamos SET ${campos.join(', ')} WHERE id_prestamo = ?`, valores);
  },

  async eliminar(id) {
    const [result] = await db.query('DELETE FROM prestamos WHERE id_prestamo = ?', [id]);
    return result;
  },
};

module.exports = Prestamo;
