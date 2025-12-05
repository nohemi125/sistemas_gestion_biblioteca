const db = require('../config/db');
const PerfilModel = require('./perfil');

const Dashboard = {
  /**
   * Calcula estadísticas de multas para el mes de la fecha dada (YYYY-MM-DD).
   */
  async estadisticasPorMes(fecha) {
    // Parsear manualmente YYYY-MM o YYYY-MM-DD
    const partes = String(fecha).split('-');
    if (partes.length < 2) throw new Error('Fecha inválida. Use YYYY-MM o YYYY-MM-DD');
    
    const year = parseInt(partes[0], 10);
    const month = parseInt(partes[1], 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new Error('Fecha inválida');
    }

    const monthStr = String(month).padStart(2, '0');

    const start = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const multaConf = await PerfilModel.obtenerMulta();
    const valorPorDia = parseFloat(multaConf?.valor_multa) || 0;
    const diasTolerancia = parseInt(multaConf?.dias_tolerancia) || 0;

      // Ahora usamos la tabla `multas` directamente (si existe) para contar montos y estados
      try {
        console.log('Consultando multas entre:', start, 'y', end);
        const [rows] = await db.query(
          `SELECT
             COUNT(*) AS generadas,
             SUM(CASE WHEN pagado = 1 THEN COALESCE(monto_pagado, 0) ELSE COALESCE(monto, 0) END) AS totalMultas,
             SUM(CASE WHEN pagado = 1 THEN 1 ELSE 0 END) AS pagadas,
             SUM(CASE WHEN pagado = 0 THEN 1 ELSE 0 END) AS pendientes
           FROM multas
           WHERE DATE(fecha_registro) BETWEEN ? AND ?`,
          [start, end]
        );

        // Contar préstamos vencidos (incluyendo los que están "Activo" pero ya pasó su fecha de devolución)
        const [prestamosVencidos] = await db.query(
          `SELECT COUNT(*) AS vencidos
           FROM prestamos p
           WHERE (
             (p.estado = 'Retrasado' OR p.estado = 'VENCIDO' OR p.estado = 'Vencido')
             OR (p.estado = 'Activo' AND p.fecha_devolucion < CURDATE())
           )`,
          []
        );

        console.log('Préstamos vencidos:', prestamosVencidos[0]);
        console.log('Resultado de la consulta multas:', rows[0]);
        const r = rows && rows[0] ? rows[0] : { generadas: 0, totalMultas: 0, pagadas: 0, pendientes: 0 };
        const vencidos = prestamosVencidos && prestamosVencidos[0] ? prestamosVencidos[0].vencidos : 0;
        
        const resultado = {
          totalMultas: Number(parseFloat(r.totalMultas || 0).toFixed(2)),
          generadas: Number(r.generadas || 0),
          pagadas: Number(r.pagadas || 0),
          pendientes: Number(r.pendientes || 0) + Number(vencidos || 0) // Multas no pagadas + préstamos vencidos sin multa
        };
        console.log('Devolviendo resultado:', resultado);
        return resultado;
      } catch (err) {
        // Si la tabla no existe o hay error, caemos al método anterior por compatibilidad
        console.warn('No se pudo consultar tabla multas en estadisticasPorMes, usando cálculo por prestamos:', err.message || err);
        const [prestamos] = await db.query(
          `SELECT p.*,
                  DATEDIFF(?, COALESCE(p.fecha_devolucion, p.fecha_prestamo)) AS dias_retraso
           FROM prestamos p
           WHERE (
             DATE(p.fecha_devolucion) BETWEEN ? AND ?
             OR DATE(p.fecha_prestamo) BETWEEN ? AND ?
             OR (DATE(p.fecha_devolucion) <= ? AND p.estado <> 'Devuelto')
           )`,
          [end, start, end, start, end, end]
        );

        let totalMultas = 0;
        let generadas = 0;
        let pagadas = 0;
        let pendientes = 0;

        for (const p of prestamos) {
          const diasRetraso = Number(p.dias_retraso) || 0;
          const diasCobrar = Math.max(0, diasRetraso - diasTolerancia);

          const monto = diasCobrar > 0 && valorPorDia > 0 ? Number((diasCobrar * valorPorDia).toFixed(2)) : 0;
          if (monto > 0) {
            generadas++;
            totalMultas += monto;
            if (p.estado === 'Devuelto') pagadas++;
            else pendientes++;
          }
        }

        return {
          totalMultas: Number(totalMultas.toFixed(2)),
          generadas,
          pagadas,
          pendientes
        };
      }
  }
};

module.exports = Dashboard;
/**
 * Devuelve un arreglo con el historial diario de multas para el mes indicado.
 * Parámetro `fecha` puede ser `YYYY-MM` o `YYYY-MM-DD`.
 * Si `includeZeros` es true, incluye días sin multas con valores 0.
 */
Dashboard.historialMultasPorMes = async function (fecha, includeZeros = true) {
  const parts = String(fecha).split('-');
  if (parts.length < 2) throw new Error('Fecha inválida. Use YYYY-MM o YYYY-MM-DD');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) throw new Error('Fecha inválida. Use YYYY-MM');

  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const multaConf = await PerfilModel.obtenerMulta();
  const valorPorDia = parseFloat(multaConf?.valor_multa) || 0;
  const diasTolerancia = parseInt(multaConf?.dias_tolerancia) || 0;

  try {
      // Inicializar días
      const days = [];
      for (let d = 1; d <= lastDay; d++) {
        const ds = String(d).padStart(2, '0');
        days.push({
          fecha: `${year}-${monthStr}-${ds}`,
          totalMultas: 0,
          generadas: 0,
          pagadas: 0,
          pendientes: 0
        });
      }

      // Consultar multas por fecha
      const [rows] = await db.query(
        `SELECT DATE(fecha_registro) AS fecha, COUNT(*) AS generadas,
                SUM(CASE WHEN pagado = 1 THEN COALESCE(monto_pagado, 0) ELSE COALESCE(monto, 0) END) AS totalMultas,
                SUM(CASE WHEN pagado = 1 THEN 1 ELSE 0 END) AS pagadas,
                SUM(CASE WHEN pagado = 0 THEN 1 ELSE 0 END) AS pendientes
         FROM multas
         WHERE DATE(fecha_registro) BETWEEN ? AND ?
         GROUP BY DATE(fecha_registro)`,
        [start, end]
      );

      for (const r of rows) {
        const idx = parseInt(r.fecha.slice(8, 10), 10) - 1;
        if (idx >= 0 && idx < days.length) {
          days[idx].totalMultas = Number(parseFloat(r.totalMultas || 0).toFixed(2));
          days[idx].generadas = Number(r.generadas || 0);
          days[idx].pagadas = Number(r.pagadas || 0);
          days[idx].pendientes = Number(r.pendientes || 0);
        }
      }

      if (!includeZeros) return days.filter(d => d.totalMultas > 0);
      return days;
    } catch (err) {
      // Fallback: usar cálculo desde prestamos si tabla multas no existe
      console.warn('No se pudo consultar tabla multas en historialMultasPorMes, usando cálculo por prestamos:', err.message || err);
      const [prestamos] = await db.query(
        `SELECT p.*,
                DATEDIFF(?, COALESCE(p.fecha_devolucion, p.fecha_prestamo)) AS dias_retraso
         FROM prestamos p
         WHERE (
           DATE(p.fecha_devolucion) BETWEEN ? AND ?
           OR DATE(p.fecha_prestamo) BETWEEN ? AND ?
           OR (DATE(p.fecha_devolucion) <= ? AND p.estado <> 'Devuelto')
         )`,
        [end, start, end, start, end, end]
      );

      // Inicializar días
      const days = [];
      for (let d = 1; d <= lastDay; d++) {
        const ds = String(d).padStart(2, '0');
        days.push({
          fecha: `${year}-${monthStr}-${ds}`,
          totalMultas: 0,
          generadas: 0,
          pagadas: 0,
          pendientes: 0
        });
      }

      for (const p of prestamos) {
        const diasRetraso = Number(p.dias_retraso) || 0;
        const diasCobrar = Math.max(0, diasRetraso - diasTolerancia);
        const monto = diasCobrar > 0 && valorPorDia > 0 ? Number((diasCobrar * valorPorDia).toFixed(2)) : 0;
        if (monto <= 0) continue;

        let atribDate = null;
        try {
          if (p.fecha_devolucion) {
            const d = new Date(p.fecha_devolucion);
            const ds = d.toISOString().slice(0, 10);
            if (ds >= start && ds <= end) atribDate = ds;
          }
        } catch (e) {}
        if (!atribDate && p.fecha_prestamo) {
          try {
            const d = new Date(p.fecha_prestamo);
            const ds = d.toISOString().slice(0, 10);
            if (ds >= start && ds <= end) atribDate = ds;
          } catch (e) {}
        }
        if (!atribDate) atribDate = end;

        const idx = parseInt(atribDate.slice(8, 10), 10) - 1;
        if (idx >= 0 && idx < days.length) {
          days[idx].totalMultas = Number((days[idx].totalMultas + monto).toFixed(2));
          days[idx].generadas += 1;
          if (p.estado === 'Devuelto') days[idx].pagadas += 1;
          else days[idx].pendientes += 1;
        }
      }

      if (!includeZeros) return days.filter(d => d.totalMultas > 0);
      return days;
    }
};
