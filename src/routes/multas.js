const express = require('express');
const router = express.Router();
const { listarMultas, pagarMulta } = require('../controllers/multas');

router.get('/', listarMultas);
router.put('/:id/pagar', pagarMulta);

module.exports = router;
