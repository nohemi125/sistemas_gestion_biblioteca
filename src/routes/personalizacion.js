const express = require('express');
const router = express.Router();
const controller = require('../controllers/personalizacion');
const checkAuth = require('../middlewares/checkAuth');

router.post('/colores', checkAuth, controller.guardarColores);
router.get('/colores', checkAuth, controller.obtenerColores);

module.exports = router;
