const express = require('express');
const router = express.Router();
const { enviarRecordatorio } = require('../controllers/notificaciones');
const checkAuth = require('../middlewares/checkAuth');

router.use(checkAuth);

router.post('/recordatorio/:usuarioId', async (req, res) => {
  const usuarioId = req.params.usuarioId;
  const resultado = await enviarRecordatorio(usuarioId);
  res.json(resultado);
});

module.exports = router;
