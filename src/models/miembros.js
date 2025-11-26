const db = require('../config/db');

const Miembro = {
  //  Obtener todos los miembros
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
      fecha_inscripcion
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
      `INSERT INTO miembros (id, nombres, apellidos, email, celular, direccion, fecha_inscripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, nombres, apellidos, email, celular, direccion, fecha_inscripcion]
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

  //  Eliminar miembro
  async eliminar(id) {
    // Comprobar si el miembro tiene préstamos u otras referencias que impidan el borrado
    try {
      const [refs] = await db.query('SELECT COUNT(*) AS cnt FROM prestamos WHERE id_miembro = ?', [id]);
      if (refs && refs[0] && refs[0].cnt > 0) {
        const err = new Error('MIEMBRO_TIENE_PRESTAMOS');
        err.code = 'MIEMBRO_TIENE_PRESTAMOS';
        throw err;
      }

      const [result] = await db.query('DELETE FROM miembros WHERE id_miembro = ?', [id]);
      return result;
    } catch (error) {
      throw error;
    }
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
      fecha_inscripcion
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
