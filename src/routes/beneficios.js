const express = require('express')
const router = express.Router()
const checkAuth = require('../middlewares/checkAuth')
const { listarMiembros } = require('../controllers/beneficios')

// Todas las rutas requieren autenticación
router.use(checkAuth)

// GET /api/beneficios/miembros?min=4&dias=30
router.get('/miembros', listarMiembros)

module.exports = router
