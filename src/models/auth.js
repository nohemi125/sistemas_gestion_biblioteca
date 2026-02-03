const db = require("../config/db");

const Usuario = {
  obtenerPorCorreo: async (correo) => {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    return rows[0]; 
  },

  actualizarContrasena: async (id, contrasena) => {
    const [result] = await db.query("UPDATE usuarios SET contrasena = ? WHERE id = ?", [contrasena, id]);
    return result.affectedRows > 0;
  }
};

module.exports = Usuario;
