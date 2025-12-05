const db = require('../config/db');

const Beneficios = {

  // Obtener todos los beneficios
  async obtenerBeneficios() {
    const [rows] = await db.query("SELECT * FROM beneficios ORDER BY id_beneficio DESC");
    return rows;
  },

  // Obtener un beneficio por ID
  async obtenerBeneficioPorId(id) {
    const [rows] = await db.query("SELECT * FROM beneficios WHERE id_beneficio = ?", [id]);
    return rows[0] || null;
  },

  // Crear un beneficio
  async crearBeneficio(data) {
    const { nombre, descripcion } = data;

    const [result] = await db.query(
      "INSERT INTO beneficios (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );

    return { id_beneficio: result.insertId, nombre, descripcion };
  },

  // Actualizar beneficio
  async actualizarBeneficio(id, data) {
    const { nombre, descripcion } = data;

    await db.query(
      "UPDATE beneficios SET nombre = ?, descripcion = ? WHERE id_beneficio = ?",
      [nombre, descripcion, id]
    );

    return { id_beneficio: id, nombre, descripcion };
  },

  // Eliminar beneficio
  async eliminarBeneficio(id) {
    await db.query("DELETE FROM beneficios WHERE id_beneficio = ?", [id]);
    return true;
  }

};

module.exports = Beneficios;
