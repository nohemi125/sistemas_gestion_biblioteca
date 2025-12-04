const express = require("express");
const router = express.Router();
const { iniciarWhatsApp, obtenerQR } = require("../services/whatsapp");

// Iniciar cliente si no ha iniciado
iniciarWhatsApp();

router.get("/qr", (req, res) => {
  const qr = obtenerQR();
  
  if (!qr) {
    return res.json({
      ok: false,
      message: "No hay QR generado (WhatsApp ya está conectado o generando QR)"
    });
  }

  res.json({ ok: true, qr });
});

module.exports = router;
