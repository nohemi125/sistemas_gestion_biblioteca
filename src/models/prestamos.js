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
        m.celular AS celular_miembro,
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
        m.celular AS celular_miembro,
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
        m.celular AS celular_miembro,
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
    // Usar transacción para verificar y decrementar stock de libro de forma atómica
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Bloquear fila del libro para evitar condiciones de carrera
      const [rows] = await conn.query('SELECT cantidad FROM libros WHERE id_libro = ? FOR UPDATE', [id_libro]);
      if (!rows || rows.length === 0) {
        await conn.rollback();
        const err = new Error('Libro no encontrado');
        err.code = 'BOOK_NOT_FOUND';
        throw err;
      }

      const cantidadActual = Number(rows[0].cantidad) || 0;
      if (cantidadActual <= 0) {
        await conn.rollback();
        const err = new Error('Libro agotado');
        err.code = 'OUT_OF_STOCK';
        throw err;
      }

      // Insertar préstamo
      const [result] = await conn.query(
        `INSERT INTO prestamos (id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado)
         VALUES (?, ?, ?, ?, ?)`,
        [id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado]
      );

      // Decrementar cantidad y actualizar estado si queda 0
      const nuevaCantidad = cantidadActual - 1;
      const nuevoEstado = nuevaCantidad <= 0 ? 'Agotado' : 'Disponible';
      await conn.query('UPDATE libros SET cantidad = ?, estado = ? WHERE id_libro = ?', [nuevaCantidad, nuevoEstado, id_libro]);

      await conn.commit();

      return { id_prestamo: result.insertId, id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado };
    } catch (err) {
      try { await conn.rollback(); } catch (_) {}
      throw err;
    } finally {
      conn.release();
    }
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
