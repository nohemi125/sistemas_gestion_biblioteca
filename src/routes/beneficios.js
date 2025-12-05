const express = require('express');
const router = express.Router();

// Importar controlador
const {
  obtenerBeneficios,
  obtenerBeneficioPorId,
  crearBeneficio,
  actualizarBeneficio,
  eliminarBeneficio
} = require('../controllers/beneficios');

// RUTAS CRUD
router.get('/', obtenerBeneficios);            // Listar todos los beneficios
router.get('/miembros', require('../controllers/beneficios').obtenerMiembrosParaBeneficios); // Miembros elegibles para beneficios
router.get('/:id', obtenerBeneficioPorId);     // Obtener uno por ID
router.post('/', crearBeneficio);              // Crear nuevo beneficio
router.post('/asignar', require('../controllers/beneficios').asignarBeneficio); // Asignar beneficio y notificar
router.put('/:id', actualizarBeneficio);       // Actualizar beneficio
router.delete('/:id', eliminarBeneficio);      // Eliminar beneficio

module.exports = router;
