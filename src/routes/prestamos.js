const express = require('express');
const {
  obtenerPrestamos,
  buscarPrestamos,
  obtenerPrestamoPorId,
  crearPrestamo,
  actualizarPrestamo,
  eliminarPrestamo
} = require('../controllers/prestamos');

const router = express.Router();

// Obtener todos los préstamos
router.get('/', obtenerPrestamos);

// Buscar préstamos
router.get('/buscar', buscarPrestamos);

// Obtener un préstamo por ID
router.get('/:id', obtenerPrestamoPorId);

// Crear un nuevo préstamo
router.post('/', crearPrestamo);

// Actualizar un préstamo
router.put('/:id', actualizarPrestamo);

// Eliminar un préstamo
router.delete('/:id', eliminarPrestamo);

module.exports = router;
