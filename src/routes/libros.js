const express = require('express');
const { obtenerLibros, obtenerLibroPorId, crearLibro, actualizarLibro, eliminarLibro, buscarLibros } = require('../controllers/libros');
const router = express.Router();

router.get('/buscar', buscarLibros);


router.get('/', obtenerLibros);
router.get('/:id', obtenerLibroPorId);
router.post('/', crearLibro);
router.put('/:id', actualizarLibro);
router.delete('/:id', eliminarLibro);


module.exports = router;
