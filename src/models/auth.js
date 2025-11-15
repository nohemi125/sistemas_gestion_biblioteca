const db = require("../config/db");

const Usuario = {
  obtenerPorCorreo: async (correo) => {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    return rows[0]; 
  }
};

module.exports = Usuario;
