const db = require('../config/db');

const guardarColores = async (colores) => {
  const [result] = await db.query(
    `UPDATE institucion SET 
     colorPrimario = ?,
     colorSecundario = ?,
     colorAcento = ?
     WHERE id_institucion = 1`,
    [colores.colorPrimario, colores.colorSecundario, colores.colorAcento]
  );
  return result;
};

const obtenerColores = async () => {
  const [rows] = await db.query(
    `SELECT colorPrimario, colorSecundario, colorAcento 
     FROM institucion WHERE id_institucion = 1`
  );
  return rows[0] || null;
};

module.exports = { guardarColores, obtenerColores };
