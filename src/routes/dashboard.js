const express = require('express');
const { multasEstadisticas, multasHistorial, resumen, librosPorCategoria, prestamosPorMes } = require('../controllers/dashboard');

const router = express.Router();

router.get('/multas', multasEstadisticas);

router.get('/multas/historial', multasHistorial);

router.get('/resumen', resumen);

router.get('/libros-categoria', librosPorCategoria);

router.get('/prestamos-mes', prestamosPorMes);

module.exports = router;module.exports = router;
