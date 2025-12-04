const express = require('express');
const checkAuth = require('../middlewares/checkAuth');
const {
  obtenerMiembros,
  obtenerMiembroPorId,
  crearMiembro,
  actualizarMiembro,
  eliminarMiembro,
  setEstadoMiembro,
  buscarMiembros,
  enviarNotificacionMiembro
} = require('../controllers/miembros');

const router = express.Router();

// Requerir autenticación para las rutas de miembros
router.use(checkAuth);

//  Buscar miembros (por nombre, apellido o correo)
router.get('/buscar', buscarMiembros);

// Obtener todos los miembros
router.get('/', obtenerMiembros);

//  Obtener un miembro por ID
router.get('/:id', obtenerMiembroPorId);

// Crear un nuevo miembro
router.post('/', crearMiembro);

// Actualizar un miembro
router.put('/:id', actualizarMiembro);

//  Eliminar un miembro
router.delete('/:id', eliminarMiembro);

// Cambiar estado activo/inactivo (soft delete / restore)
router.patch('/:id/estado', setEstadoMiembro);

// Enviar notificación manual a un miembro (email + WhatsApp)
router.post('/:id/notify', enviarNotificacionMiembro);

module.exports = router;
