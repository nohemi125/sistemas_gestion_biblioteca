const db = require('../config/db')

/**
 * Devuelve la lista de miembros con el conteo de préstamos en los últimos X días.
 * Query params: ?min=NUMBER (min préstamos), ?dias=NUMBER (últimos días)
 */
const listarMiembros = async (req, res) => {
  try {
    const min = parseInt(req.query.min, 10) || 0
    const dias = parseInt(req.query.dias, 10) || 30
    // minDaysPerLoan: número mínimo de días que el libro debió haber estado en préstamo para contar
    const minDaysPerLoan = parseInt(req.query.minDays, 10) || 7

    // Si la columna "fecha_devolucion_real" no existe en la tabla, usamos "fecha_devolucion".
    // Muchos esquemas usan solo `fecha_devolucion` (fecha objetivo) y la usan también como fecha real si el estado es 'Devuelto'.
    const sql = `
      SELECT
        m.id_miembro,
        m.id,
        m.nombres,
        m.apellidos,
        m.email,
        m.celular,
        m.fecha_inscripcion,
        COUNT(p.id_prestamo) AS prestamos_count
      FROM miembros m
      LEFT JOIN prestamos p ON p.id_miembro = m.id_miembro
        AND p.estado = 'Devuelto'
        AND p.fecha_devolucion IS NOT NULL
        AND TIMESTAMPDIFF(DAY, p.fecha_prestamo, p.fecha_devolucion) >= ?
        AND p.fecha_devolucion >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY m.id_miembro
      HAVING prestamos_count >= ?
      ORDER BY prestamos_count DESC, m.nombres ASC
    `

    const [rows] = await db.query(sql, [minDaysPerLoan, dias, min])
    res.json(rows)
  } catch (error) {
    console.error('Error listarMiembros beneficios:', error)
    res.status(500).json({ error: 'Error al obtener miembros' })
  }
}

module.exports = {
  listarMiembros,
}
