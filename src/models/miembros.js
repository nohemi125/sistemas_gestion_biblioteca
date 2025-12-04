const db = require('../config/db');

const Miembro = {
  //  Obtener todos los miembros (incluye estado 'activo' para borrado lógico)
  async obtenerTodos() {
    const [rows] = await db.query(`
      SELECT 
        id_miembro,
        id,
        nombres,
        apellidos,
        email,
        direccion,
        celular,
        fecha_inscripcion,
        COALESCE(activo, 1) AS activo
      FROM miembros
    `);
    return rows;
  },


  //  Obtener un miembro por ID
  async obtenerPorId(id) {
    const [rows] = await db.query("SELECT * FROM miembros WHERE id_miembro = ?", [id]);
    return rows[0];
  },

  //  Crear un nuevo miembro
  async crear(datos) {
    const { id, nombres, apellidos, email, celular, direccion, fecha_inscripcion } = datos;

    const [result] = await db.query(
      `INSERT INTO miembros (id, nombres, apellidos, email, celular, direccion, fecha_inscripcion, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, nombres, apellidos, email, celular, direccion, fecha_inscripcion, 1]
    );

    return { id_miembro: result.insertId, ...datos };
  },

  //  Actualizar un miembro existente
  async actualizar(id, datos) {
    // Construir la consulta dinámicamente con los campos permitidos
    const permitidos = ['id', 'nombres', 'apellidos', 'email', 'celular', 'direccion', 'fecha_inscripcion'];
    const campos = [];
    const valores = [];

    for (const campo of permitidos) {
      if (datos[campo] !== undefined) {
        campos.push(`${campo} = ?`);
        valores.push(datos[campo]);
      }
    }

    if (campos.length === 0) return;

    valores.push(id);
    const sql = `UPDATE miembros SET ${campos.join(', ')} WHERE id_miembro = ?`;
    await db.query(sql, valores);
  },

  //  Eliminar miembro (borrado lógico: marcar como inactivo)
  async eliminar(id) {
    // Borrado lógico: marcar activo = 0 si no tiene préstamos activos
    try {
      const [refs] = await db.query("SELECT COUNT(*) AS cnt FROM prestamos WHERE id_miembro = ? AND estado = 'Activo'", [id]);
      if (refs && refs[0] && refs[0].cnt > 0) {
        const err = new Error('MIEMBRO_TIENE_PRESTAMOS');
        err.code = 'MIEMBRO_TIENE_PRESTAMOS';
        throw err;
      }

      const [result] = await db.query('UPDATE miembros SET activo = 0 WHERE id_miembro = ?', [id]);
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Cambiar estado activo/inactivo
  async setActivo(id, activo) {
    const [result] = await db.query('UPDATE miembros SET activo = ? WHERE id_miembro = ?', [activo ? 1 : 0, id]);
    return result;
  },

  //  Buscar miembros (por nombre o correo)
  async buscar(filtro) {
  let sql = `
    SELECT 
      id_miembro AS id_miembro,
      id,
      nombres,
      apellidos,
      email,
      celular,
      direccion,
      fecha_inscripcion,
      COALESCE(activo, 1) AS activo
    FROM miembros
    WHERE 1=1
  `;
  const params = [];

  if (filtro) {
    sql += " AND (nombres LIKE ? OR apellidos LIKE ? OR email LIKE ? OR id LIKE ?)";
    params.push(`%${filtro}%`, `%${filtro}%`, `%${filtro}%`, `%${filtro}%`);
  }

  const [rows] = await db.query(sql, params);
  return rows;
}

};

module.exports = Miembro;
