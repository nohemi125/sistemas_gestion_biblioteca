const express = require('express');
const { multasEstadisticas, multasHistorial, resumen, librosPorCategoria } = require('../controllers/dashboard');

const router = express.Router();

router.get('/multas', multasEstadisticas);

router.get('/multas/historial', multasHistorial);

router.get('/resumen', resumen);

router.get('/libros-categoria', librosPorCategoria);

module.exports = router;module.exports = router;
