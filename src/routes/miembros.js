const express = require('express');
const {
  obtenerMiembros,
  obtenerMiembroPorId,
  crearMiembro,
  actualizarMiembro,
  eliminarMiembro,
  buscarMiembros
} = require('../controllers/miembros');

const router = express.Router();

// 🔍 Buscar miembros (por nombre, apellido o correo)
router.get('/buscar', buscarMiembros);

// 📋 Obtener todos los miembros
router.get('/', obtenerMiembros);

// 🔎 Obtener un miembro por ID
router.get('/:id', obtenerMiembroPorId);

// ➕ Crear un nuevo miembro
router.post('/', crearMiembro);

// ✏️ Actualizar un miembro
router.put('/:id', actualizarMiembro);

// ❌ Eliminar un miembro
router.delete('/:id', eliminarMiembro);

module.exports = router;
