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


  // ✅ Obtener un miembro por ID
  async obtenerPorId(id) {
    const [rows] = await db.query("SELECT * FROM miembros WHERE id_miembro = ?", [id]);
    return rows[0];
  },

  // ✅ Crear un nuevo miembro
  async crear(datos) {
    const { id, nombres, apellidos, email, celular, direccion, fecha_inscripcion } = datos;

    const [result] = await db.query(
      `INSERT INTO miembros (id, nombres, apellidos, email, celular, direccion, fecha_inscripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, nombres, apellidos, email, celular, direccion, fecha_inscripcion]
    );

    return { id_miembro: result.insertId, ...datos };
  },

  // ✅ Actualizar un miembro existente
  async actualizar(id, datos) {
    const { id: identificacion, nombres, apellidos, email, celular, direccion, fecha_inscripcion } = datos;

    await db.query(
      `UPDATE miembros 
       SET id = ?, nombres = ?, apellidos = ?, email = ?, celular = ?, direccion = ?, fecha_inscripcion = ?
       WHERE id_miembro = ?`,
      [identificacion, nombres, apellidos, email, celular, direccion, fecha_inscripcion, id]
    );
  },

  // ✅ Eliminar miembro
  async eliminar(id) {
    const [result] = await db.query('DELETE FROM miembros WHERE id_miembro = ?', [id]);
    return result;
  },

  // ✅ Buscar miembros (por nombre o correo)
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
