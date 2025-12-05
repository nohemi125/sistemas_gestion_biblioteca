const db = require('../config/db');
const Perfil = require('../models/perfil');

async function obtenerConf() {
  const conf = await Perfil.obtenerMulta();
  return {
    valorPorDia: parseFloat(conf?.valor_multa) || 0,
    diasTolerancia: parseInt(conf?.dias_tolerancia) || 0
  };
}

async function generarOModificarMultaParaPrestamo(prestamo) {
  if (!prestamo) return null;

  // Si el préstamo ya está devuelto, no generar (salvo que quieras contabilizar)
  if (prestamo.estado && prestamo.estado.toLowerCase() === 'devuelto') return null;

  const conf = await obtenerConf();
  const hoy = new Date();
  const fechaVenc = new Date(prestamo.fecha_devolucion);

  // diferencia en días entre hoy y fecha de vencimiento
  const msPorDia = 24 * 60 * 60 * 1000;
  const dif = Math.floor((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(fechaVenc.getFullYear(), fechaVenc.getMonth(), fechaVenc.getDate())) / msPorDia);
  const diasRetrasoTotal = Math.max(0, dif);

  // aplicar tolerancia
  const diasAplicables = Math.max(0, diasRetrasoTotal - conf.diasTolerancia);
  const monto = parseFloat((diasAplicables * conf.valorPorDia).toFixed(2));

  if (diasAplicables <= 0) return null; // no corresponde multa

  // Ver si ya existe multa no pagada para este préstamo
  const [exist] = await db.query('SELECT * FROM multas WHERE id_prestamo = ? LIMIT 1', [prestamo.id_prestamo]);
  if (exist && exist.length > 0) {
    const fila = exist[0];
    // actualizar dias y monto solo si cambió
    await db.query('UPDATE multas SET dias_retraso = ?, monto = ?, fecha_registro = CURRENT_TIMESTAMP WHERE id_multas = ?', [diasAplicables, monto, fila.id_multas]);
    return { updated: true, id: fila.id_multas };
  }

  // insertar multa nueva
  const [result] = await db.query(
    'INSERT INTO multas (id_prestamo, id_miembro, dias_retraso, monto, pagado, fecha_registro) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [prestamo.id_prestamo, prestamo.id_miembro, diasAplicables, monto]
  );

  // opcional: marcar el préstamo como 'Retrasado'
  try {
    await db.query("UPDATE prestamos SET estado = 'Retrasado' WHERE id_prestamo = ?", [prestamo.id_prestamo]);
  } catch (e) {
    // no crítico
  }

  return { insertedId: result.insertId, monto, dias: diasAplicables };
}

async function generarMultasDiarias() {
  // obtener prestamos vencidos y no devueltos
  const [rows] = await db.query("SELECT * FROM prestamos WHERE (estado != 'Devuelto' AND DATE(fecha_devolucion) < CURDATE())");
  for (const p of rows) {
    try {
      await generarOModificarMultaParaPrestamo(p);
    } catch (err) {
      console.error('Error generando multa para prestamo', p.id_prestamo, err);
    }
  }
}

async function generarMultaAlDevolver(prestamo) {
  if (!prestamo) return null;
  const conf = await obtenerConf();
  const hoy = new Date();
  const fechaVenc = new Date(prestamo.fecha_devolucion);
  const msPorDia = 24 * 60 * 60 * 1000;
  const dif = Math.floor((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(fechaVenc.getFullYear(), fechaVenc.getMonth(), fechaVenc.getDate())) / msPorDia);
  const diasRetrasoTotal = Math.max(0, dif);
  const diasAplicables = Math.max(0, diasRetrasoTotal - conf.diasTolerancia);
  if (diasAplicables <= 0) return null;
  const monto = parseFloat((diasAplicables * conf.valorPorDia).toFixed(2));

  // insertar o actualizar similar a generarOModificarMultaParaPrestamo
  const [exist] = await db.query('SELECT * FROM multas WHERE id_prestamo = ? LIMIT 1', [prestamo.id_prestamo]);
  if (exist && exist.length > 0) {
    const fila = exist[0];
    await db.query('UPDATE multas SET dias_retraso = ?, monto = ?, pagado = 0, fecha_registro = CURRENT_TIMESTAMP WHERE id_multas = ?', [diasAplicables, monto, fila.id_multas]);
    return { updated: true, id: fila.id_multas };
  }

  const [result] = await db.query(
    'INSERT INTO multas (id_prestamo, id_miembro, dias_retraso, monto, pagado, fecha_registro) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
    [prestamo.id_prestamo, prestamo.id_miembro, diasAplicables, monto]
  );
  return { insertedId: result.insertId, monto, dias: diasAplicables };
}

// Abonar o marcar como pagada la multa asociada a un préstamo
async function pagarMultaPorPrestamo(idPrestamo, abono = 0) {
  const [rows] = await db.query('SELECT * FROM multas WHERE id_prestamo = ? LIMIT 1', [idPrestamo]);
  let multa = rows && rows.length > 0 ? rows[0] : null;

  // Si no existe multa, crear una entrada pagada con monto 0 (para dejar registro)
  if (!multa) {
    try {
      // intentar obtener datos del préstamo para calcular multa real
      const [pRows] = await db.query('SELECT * FROM prestamos WHERE id_prestamo = ? LIMIT 1', [idPrestamo]);
      const prestamo = pRows && pRows.length > 0 ? pRows[0] : null;
      const idMiembro = prestamo ? prestamo.id_miembro : null;

      // calcular dias y monto usando la configuración
      let diasAplicables = 0;
      let montoCalculado = 0;
      try {
        if (prestamo && prestamo.fecha_devolucion) {
          const conf = await obtenerConf();
          const hoy = new Date();
          const fechaVenc = new Date(prestamo.fecha_devolucion);
          const msPorDia = 24 * 60 * 60 * 1000;
          const dif = Math.floor((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(fechaVenc.getFullYear(), fechaVenc.getMonth(), fechaVenc.getDate())) / msPorDia);
          const diasRetrasoTotal = Math.max(0, dif);
          diasAplicables = Math.max(0, diasRetrasoTotal - (conf.diasTolerancia || 0));
          montoCalculado = parseFloat((diasAplicables * (conf.valorPorDia || 0)).toFixed(2));
        }
      } catch (e) {
        // si falla cálculo, dejar montos en 0
        console.warn('multasService: error calculando monto al crear multa por defecto', e && e.message ? e.message : e);
      }

      // Intentar insertar la multa marcada como pagada con monto_pagado y fecha_pago (si existen columnas)
      try {
        // Guardar el monto original y el monto_pagado igual al calculado
        const [ins] = await db.query(
          'INSERT INTO multas (id_prestamo, id_miembro, dias_retraso, monto, pagado, monto_pagado, fecha_registro, fecha_pago) VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [idPrestamo, idMiembro, diasAplicables, montoCalculado, montoCalculado]
        );
        const [newRows] = await db.query('SELECT * FROM multas WHERE id_multas = ? LIMIT 1', [ins.insertId]);
        multa = newRows && newRows.length > 0 ? newRows[0] : null;
        console.log('multasService: creada multa pagada (con monto) para prestamo', idPrestamo, 'id_multas=', ins.insertId, 'monto_pagado=', montoCalculado);
      } catch (e) {
        // si la tabla no tiene columnas monto_pagado/fecha_pago, caer al insert compatible anterior
        // en este caso al menos guardamos el monto calculado en la columna `monto`
        const [ins] = await db.query('INSERT INTO multas (id_prestamo, id_miembro, dias_retraso, monto, pagado, fecha_registro) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)', [idPrestamo, idMiembro, diasAplicables, montoCalculado]);
        const [newRows] = await db.query('SELECT * FROM multas WHERE id_multas = ? LIMIT 1', [ins.insertId]);
        multa = newRows && newRows.length > 0 ? newRows[0] : null;
        console.log('multasService: creada multa defecto pagada para prestamo', idPrestamo, 'id_multas=', ins.insertId, '(fallback)');
      }
    } catch (e) {
      console.error('multasService: error creando multa por defecto al pagar:', e);
      return null;
    }
  }

  const abonoNum = parseFloat(abono || 0);
  if (abonoNum <= 0) {
    // marcar como pagada en su totalidad
    // registrar el monto pagado y la fecha de pago (mantener registro del monto original)
    const montoOriginal = parseFloat(multa.monto) || 0;
    try {
      await db.query('UPDATE multas SET monto = 0, pagado = 1, monto_pagado = ?, fecha_pago = CURRENT_TIMESTAMP WHERE id_multas = ?', [montoOriginal, multa.id_multas]);
    } catch (e) {
      // Si la columna monto_pagado/fecha_pago no existe, caer a la compatibilidad previa (mantener monto a 0 y pagado)
      await db.query('UPDATE multas SET monto = 0, pagado = 1 WHERE id_multas = ?', [multa.id_multas]);
      return { id: multa.id_multas, pagado: true, restante: 0, warning: 'monto_pagado column missing' };
    }
    return { id: multa.id_multas, pagado: true, restante: 0, monto_pagado: montoOriginal };
  }

  const restante = parseFloat((parseFloat(multa.monto) - abonoNum).toFixed(2));
  if (restante <= 0) {
    // registrar abono que salda la multa: actualizar monto_pagado acumulado
    const montoOriginal = parseFloat(multa.monto) || 0;
    const montoPagadoPrev = parseFloat(multa.monto_pagado) || 0;
    const nuevoMontoPagado = parseFloat((montoPagadoPrev + abonoNum).toFixed(2)) || montoOriginal;
    try {
      await db.query('UPDATE multas SET monto = 0, pagado = 1, monto_pagado = ?, fecha_pago = CURRENT_TIMESTAMP WHERE id_multas = ?', [nuevoMontoPagado, multa.id_multas]);
    } catch (e) {
      await db.query('UPDATE multas SET monto = 0, pagado = 1 WHERE id_multas = ?', [multa.id_multas]);
      return { id: multa.id_multas, pagado: true, restante: 0, warning: 'monto_pagado column missing' };
    }
    return { id: multa.id_multas, pagado: true, restante: 0, monto_pagado: nuevoMontoPagado };
  }
  
  // parcial: actualizar monto restante y acumular monto_pagado
  const montoPagadoPrev = parseFloat(multa.monto_pagado) || 0;
  const nuevoMontoPagado = parseFloat((montoPagadoPrev + abonoNum).toFixed(2));
  try {
    await db.query('UPDATE multas SET monto = ?, pagado = 0, monto_pagado = ? WHERE id_multas = ?', [restante, nuevoMontoPagado, multa.id_multas]);
  } catch (e) {
    await db.query('UPDATE multas SET monto = ?, pagado = 0 WHERE id_multas = ?', [restante, multa.id_multas]);
    return { id: multa.id_multas, pagado: false, restante, warning: 'monto_pagado column missing' };
  }
  return { id: multa.id_multas, pagado: false, restante, monto_pagado: nuevoMontoPagado };
}

module.exports = {
  generarOModificarMultaParaPrestamo,
  generarMultasDiarias,
  generarMultaAlDevolver
  , pagarMultaPorPrestamo
};


