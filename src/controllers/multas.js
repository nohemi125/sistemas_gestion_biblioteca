const db = require('../config/db');

async function listarMultas(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT m.*, p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion, CONCAT(mi.nombres, ' ', mi.apellidos) AS miembro_nombre
      FROM multas m
      LEFT JOIN prestamos p ON p.id_prestamo = m.id_prestamo
      LEFT JOIN miembros mi ON mi.id_miembro = m.id_miembro
      ORDER BY m.fecha_registro DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error listarMultas:', err);
    res.status(500).json({ error: 'Error al obtener multas' });
  }
}

// pagar o abonar una multa: body { abono: 10.00 } (cantidad a abonar)
async function pagarMulta(req, res) {
  try {
    const { id } = req.params;
    const { abono } = req.body;
    const [rows] = await db.query('SELECT * FROM multas WHERE id_multas = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Multa no encontrada' });
    const multa = rows[0];

    const abonoNum = parseFloat(abono || 0);
    if (abonoNum <= 0) {
      // marcar como pagada en su totalidad
      // intentar registrar monto_pagado y fecha_pago, manteniendo registro del monto original
      const montoOriginal = parseFloat(multa.monto) || 0;
      try {
        await db.query('UPDATE multas SET monto = 0, pagado = 1, monto_pagado = ?, fecha_pago = CURRENT_TIMESTAMP WHERE id_multas = ?', [montoOriginal, id]);
      } catch (e) {
        await db.query('UPDATE multas SET monto = 0, pagado = 1 WHERE id_multas = ?', [id]);
        return res.json({ mensaje: 'Multa marcada como pagada', warning: 'monto_pagado column missing' });
      }
      return res.json({ mensaje: 'Multa marcada como pagada', monto_pagado: montoOriginal });
    }

    const restante = parseFloat((parseFloat(multa.monto) - abonoNum).toFixed(2));
    if (restante <= 0) {
      const montoPagadoPrev = parseFloat(multa.monto_pagado) || 0;
      const nuevoMontoPagado = parseFloat((montoPagadoPrev + abonoNum).toFixed(2)) || parseFloat(multa.monto || 0);
      try {
        await db.query('UPDATE multas SET monto = 0, pagado = 1, monto_pagado = ?, fecha_pago = CURRENT_TIMESTAMP WHERE id_multas = ?', [nuevoMontoPagado, id]);
      } catch (e) {
        await db.query('UPDATE multas SET monto = 0, pagado = 1 WHERE id_multas = ?', [id]);
        return res.json({ mensaje: 'Pago completado. Multa pagada', warning: 'monto_pagado column missing' });
      }
      return res.json({ mensaje: 'Pago completado. Multa pagada', monto_pagado: nuevoMontoPagado });
    }

    const montoPagadoPrev = parseFloat(multa.monto_pagado) || 0;
    const nuevoMontoPagado = parseFloat((montoPagadoPrev + abonoNum).toFixed(2));
    try {
      await db.query('UPDATE multas SET monto = ?, pagado = 0, monto_pagado = ? WHERE id_multas = ?', [restante, nuevoMontoPagado, id]);
    } catch (e) {
      await db.query('UPDATE multas SET monto = ?, pagado = 0 WHERE id_multas = ?', [restante, id]);
      return res.json({ mensaje: 'Abono registrado', restante, warning: 'monto_pagado column missing' });
    }
    res.json({ mensaje: 'Abono registrado', restante, monto_pagado: nuevoMontoPagado });
  } catch (err) {
    console.error('Error pagarMulta:', err);
    res.status(500).json({ error: 'Error al procesar pago/abono' });
  }
}

module.exports = {
  listarMultas,
  pagarMulta
};
