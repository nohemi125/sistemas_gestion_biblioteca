const express = require("express");
const router = express.Router();
const { iniciarWhatsApp, obtenerQR, desconectarWhatsApp, estadoWhatsApp } = require("../services/whatsapp");

// Iniciar cliente si no ha iniciado
iniciarWhatsApp();

router.get("/qr", async (req, res) => {
  try {
    // Asegurar que el cliente esté inicializado (si ya está inicializado, la función retornará rápidamente)
    try { await iniciarWhatsApp(); } catch (e) { /* continuar, el cliente puede iniciar en background */ }

    // Esperar hasta que `obtenerQR()` devuelva un QR o hasta timeout
    // Aumentamos el timeout y reducimos el intervalo para dar tiempo a la generación/convertidor de imagen
    const timeoutMs = 20000; // 20s
    const pollInterval = 250;
    const start = Date.now();
    let qr = obtenerQR();
    while (!qr && (Date.now() - start) < timeoutMs) {
      // esperar un poco
      await new Promise(r => setTimeout(r, pollInterval));
      qr = obtenerQR();
    }

    if (!qr) {
      // Si no hay QR, verificar si el servicio ya está conectado a una cuenta
      try {
        const estado = estadoWhatsApp();
        if (estado && estado.connected) {
          return res.json({ ok: false, connected: true, message: 'WhatsApp ya está conectado.' });
        }
      } catch (e) {
        // ignorar y devolver mensaje genérico
      }
      return res.json({ ok: false, message: "No hay QR generado (intente de nuevo)." });
    }

    return res.json({ ok: true, qr });
  } catch (err) {
    console.error('Error en /api/wpp/qr:', err);
    return res.status(500).json({ ok: false, message: 'Error al obtener QR' });
  }
});

// Desconectar / eliminar sesión y forzar nueva generación de QR
router.post('/disconnect', async (req, res) => {
  try {
    await desconectarWhatsApp();
    return res.json({ ok: true, mensaje: 'WhatsApp desconectado.' });
  } catch (err) {
    console.error('Error desconectando WhatsApp desde ruta:', err);
    return res.status(500).json({ ok: false, mensaje: 'Error al desconectar WhatsApp.' });
  }
});

module.exports = router;
// Estado simple: connected/hasQR
router.get('/status', (req, res) => {
  try {
    const estado = estadoWhatsApp();
    return res.json({ ok: true, data: estado });
  } catch (err) {
    console.error('Error en /api/wpp/status:', err);
    return res.status(500).json({ ok: false, message: 'No se pudo obtener estado de WhatsApp' });
  }
});
