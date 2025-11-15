const express = require('express');
const router = express.Router();
const { enviarRecordatorio, enviarMulta } = require('../controllers/emails');
const checkAuth = require('../middlewares/checkAuth');

// Todas las rutas requieren autenticación
router.use(checkAuth);

// POST /api/emails/recordatorio - Enviar recordatorio de devolución
router.post('/recordatorio', enviarRecordatorio);

// POST /api/emails/multa - Enviar notificación de multa
router.post('/multa', enviarMulta);

module.exports = router;
