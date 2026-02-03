const db = require('../config/db');
const DashboardModel = require('../models/dashboard');

// GET /api/dashboard/multas?mes=YYYY-MM
const multasEstadisticas = async (req, res) => {
    try {
        const { mes } = req.query;
        console.log('Recibido parámetro mes:', mes);
        if (!mes) return res.status(400).json({ error: 'Parámetro "mes" requerido (YYYY-MM).' });

        const datos = await DashboardModel.estadisticasPorMes(mes);
        return res.json(datos);
    } catch (err) {
        console.error('Error en controller.dashboard.multasEstadisticas:', err);
        res.status(500).json({ error: 'Error al calcular estadísticas de multas.' });
    }
};

// GET /api/dashboard/multas/historial?fecha=YYYY-MM or YYYY-MM-DD&includeZeros=true
const multasHistorial = async (req, res) => {
    try {
        const { fecha, includeZeros } = req.query;
        if (!fecha) return res.status(400).json({ error: 'Parámetro "fecha" requerido (YYYY-MM o YYYY-MM-DD).' });

        const incluir = includeZeros === undefined ? true : String(includeZeros) !== 'false';
        const datos = await DashboardModel.historialMultasPorMes(fecha, incluir);
        return res.json(datos);
    } catch (err) {
        console.error('Error en controller.dashboard.multasHistorial:', err);
        res.status(500).json({ error: 'Error al obtener historial de multas.' });
    }
};

// GET /api/dashboard/resumen
const resumen = async (req, res) => {
    try {
        const [[{ activos }]] = await db.query("SELECT COUNT(*) AS activos FROM prestamos WHERE estado = 'Activo' OR estado = 'Retrasado'");
        
        // Contar préstamos vencidos (incluyendo los que están "Activo" pero ya pasó su fecha de devolución)
        const [[{ vencidos }]] = await db.query(
          `SELECT COUNT(*) AS vencidos
           FROM prestamos p
           WHERE (
             (p.estado = 'Retrasado' OR p.estado = 'VENCIDO' OR p.estado = 'Vencido')
             OR (p.estado = 'Activo' AND p.fecha_devolucion < CURDATE())
           )`
        );
        
        const [[{ miembros }]] = await db.query('SELECT COUNT(*) AS miembros FROM miembros');
        const [[{ libros }]] = await db.query('SELECT COUNT(*) AS libros FROM libros');

        let beneficios = 0;
        try {
            const [[{ cnt }]] = await db.query('SELECT COUNT(*) AS cnt FROM beneficios');
            beneficios = cnt || 0;
        } catch (e) {
            beneficios = 0;
        }

        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
        const multas = await DashboardModel.estadisticasPorMes(hoyStr);

        return res.json({
            prestamosActivos: Number(activos) || 0,
            prestamosVencidos: Number(vencidos) || 0,
            miembrosRegistrados: Number(miembros) || 0,
            librosRegistrados: Number(libros) || 0,
            beneficiosOtorgados: Number(beneficios) || 0,
            multasDelMes: multas.totalMultas || 0
        });
    } catch (err) {
        console.error('Error en controller.dashboard.resumen:', err);
        res.status(500).json({ error: 'Error al obtener resumen del dashboard.' });
    }
};

// GET /api/dashboard/libros-categoria
const librosPorCategoria = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT l.categoria, COUNT(*) AS cantidad
             FROM prestamos p
             JOIN libros l ON p.id_libro = l.id_libro
             GROUP BY l.categoria
             ORDER BY cantidad DESC`
        );

        return res.json(rows || []);
    } catch (err) {
        console.error('Error en controller.dashboard.librosPorCategoria:', err);
        res.status(500).json({ error: 'Error al obtener libros por categoría.' });
    }
};

// GET /api/dashboard/prestamos-por-mes
const prestamosPorMes = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                MONTH(fecha_prestamo) AS mes,
                COUNT(*) AS realizados
             FROM prestamos
             WHERE YEAR(fecha_prestamo) = YEAR(CURDATE())
             GROUP BY MONTH(fecha_prestamo)
             ORDER BY mes`
        );

        // Crear array con todos los meses (0 para meses sin datos)
        const dataPorMes = Array(12).fill(0);
        for (const row of rows) {
            dataPorMes[row.mes - 1] = row.realizados;
        }

        // También obtener préstamos devueltos
        const [rowsDevueltos] = await db.query(
            `SELECT 
                MONTH(fecha_devolucion) AS mes,
                COUNT(*) AS devueltos
             FROM prestamos
             WHERE YEAR(fecha_devolucion) = YEAR(CURDATE())
             GROUP BY MONTH(fecha_devolucion)
             ORDER BY mes`
        );

        const dataDevueltosPorMes = Array(12).fill(0);
        for (const row of rowsDevueltos) {
            dataDevueltosPorMes[row.mes - 1] = row.devueltos;
        }

        return res.json({
            realizados: dataPorMes,
            devueltos: dataDevueltosPorMes
        });
    } catch (err) {
        console.error('Error en controller.dashboard.prestamosPorMes:', err);
        res.status(500).json({ error: 'Error al obtener préstamos por mes.' });
    }
};

module.exports = {
    multasEstadisticas,
    multasHistorial,
    resumen,
    librosPorCategoria,
    prestamosPorMes
};
