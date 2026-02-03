const db = require('../config/db');

const Libro = {
  async obtenerTodos() {
    const [rows] = await db.query('SELECT id_libro AS id, titulo, autor, isbn, imagen, categoria, cantidad, estado FROM libros');
    return rows;
  },
  
async obtenerPorId(id) {
  const [rows] = await db.query("SELECT * FROM libros WHERE id_libro = ?", [id]);
  return rows[0];
},

  // Crear libro
  async crear(datos) {
    const { titulo, autor, isbn, imagen, categoria, cantidad, estado } = datos;

    // Verificar si ya existe un libro con el mismo ISBN
    const [librosExistentes] = await db.query(
      'SELECT id_libro, cantidad FROM libros WHERE isbn = ?',
      [isbn]
    );

    // Si el libro ya existe, sumar la cantidad
    if (librosExistentes.length > 0) {
      const libroExistente = librosExistentes[0];
      const nuevaCantidad = Number(libroExistente.cantidad) + Number(cantidad);
      const nuevoEstado = nuevaCantidad > 0 ? 'Disponible' : 'Agotado';

      await db.query(
        'UPDATE libros SET cantidad = ?, estado = ? WHERE id_libro = ?',
        [nuevaCantidad, nuevoEstado, libroExistente.id_libro]
      );

      return { 
        id: libroExistente.id_libro, 
        mensaje: 'Cantidad actualizada en libro existente',
        cantidadAnterior: libroExistente.cantidad,
        cantidadAgregada: cantidad,
        cantidadTotal: nuevaCantidad
      };
    }

    // Si no existe, crear el libro nuevo
    const [result] = await db.query(
      `INSERT INTO libros (titulo, autor, isbn, imagen, categoria, cantidad, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, autor, isbn, imagen, categoria, cantidad, estado]
    );

    return { id: result.insertId, ...datos };
  },

  //  Actualizar libro
  async actualizar(id, datos) {
    const { titulo, autor, isbn, imagen, categoria, cantidad, estado } = datos;

    await db.query(
      `UPDATE libros 
       SET titulo = ?, autor = ?, isbn = ?, imagen = ?, categoria = ?, cantidad = ?, estado = ? 
       WHERE id_libro = ?`,
      [titulo, autor, isbn, imagen, categoria, cantidad, estado, id]
    );
  },

  //  Eliminar libro
async eliminar(id) {
  const [result] = await db.query('DELETE FROM libros WHERE id_libro = ?', [id]);
  return result;
},

  // Incrementar cantidad de un libro (y actualizar estado a 'Disponible' si aplica)
  async incrementarCantidad(id, incremento = 1) {
    const [rows] = await db.query('SELECT cantidad FROM libros WHERE id_libro = ?', [id]);
    if (!rows || rows.length === 0) return null;
    const cantidadActual = Number(rows[0].cantidad) || 0;
    const nuevaCantidad = cantidadActual + Number(incremento);
    const nuevoEstado = nuevaCantidad <= 0 ? 'Agotado' : 'Disponible';
    await db.query('UPDATE libros SET cantidad = ?, estado = ? WHERE id_libro = ?', [nuevaCantidad, nuevoEstado, id]);
    return { nuevaCantidad };
  },


// Buscar libros por texto y/o categoría
async buscar(filtro, categoria) {
  let sql = "SELECT id_libro AS id, titulo, autor, isbn, imagen, categoria, cantidad, estado FROM libros WHERE 1=1";
  const params = [];

  if (filtro) {
    sql += " AND (titulo LIKE ? OR autor LIKE ?)";
    params.push(`%${filtro}%`, `%${filtro}%`);
  }

  if (categoria) {
    sql += " AND categoria = ?";
    params.push(categoria);
  }

  const [rows] = await db.query(sql, params);
  return rows; // 👈 Esto debe devolver un array
}


};


module.exports = Libro;
