const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
let client;
let qrActual = null; // <-- Guardaremos el QR aquí
let clientReadyPromise = null;
let isReady = false;

// Evitar que rechazos no manejados o excepciones uncaught cierren el proceso sin log
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (to avoid crash):', err && err.stack ? err.stack : err);
});

async function iniciarWhatsApp() {
  if (client) return client;
  // Configurar opciones de puppeteer para evitar problemas en sistemas donde
  // Chromium no se inicia correctamente (sin sandbox en contenedores, etc.).
  const puppeteerOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  };

  // Si el usuario proporcionó un ejecutable de Chromium via env, úsalo
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'biblioteca' }),
    puppeteer: puppeteerOpts
  });

  // Promesa que se resolverá cuando el cliente emita 'ready'
  clientReadyPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      client.removeListener('auth_failure', onAuthFail)
      resolve(client)
    }
    const onAuthFail = (msg) => {
      reject(new Error('WhatsApp auth failure: ' + msg))
    }
    client.once('ready', onReady)
    client.once('auth_failure', onAuthFail)
  })

  client.on('qr', async (qr) => {
    console.log("Nuevo QR generado");

    // Convertimos a imagen base64
    qrActual = await qrcode.toDataURL(qr);
  });

  client.on('auth_failure', (msg) => {
    console.error('Auth failure (WhatsApp):', msg);
    // limpiar qrActual para que el frontend pueda intentar regenerar
    qrActual = null;
    isReady = false;
  });

  client.on('disconnected', (reason) => {
    console.warn('WhatsApp desconectado:', reason);
    // Limpiar estado para permitir reconexión
    client = null;
    qrActual = null;
    clientReadyPromise = null;
    isReady = false;
  });

  client.on('error', (err) => {
    console.error('WhatsApp client error:', err && err.message ? err.message : err);
  });

  client.on('ready', () => {
    console.log("WhatsApp listo!");
    qrActual = null; // Ya no hace falta QR
    isReady = true;
  });

  try {
    client.initialize();
  } catch (initErr) {
    console.error('Error inicializando cliente WhatsApp:', initErr && initErr.message ? initErr.message : initErr);
    // No arrojar para que el servidor siga funcionando; propagar error de forma controlada
  }
  return client;
}

function obtenerQR() {
  return qrActual; // devolvemos el QR actual
}

// Enviar mensaje de texto a un número (intenta normalizar el número y asegura que el cliente esté listo)
async function enviarMensaje(numero, texto) {
  try {
    const client = await iniciarWhatsApp();

    if (!numero) throw new Error('Número de destino vacío');

    // Normalizar número: eliminar espacios, signos y paréntesis
    let digits = String(numero).replace(/[^0-9]/g, '');

    // Añadir código de país por defecto si el número parece local (configurable vía env)
    const defaultCountry = process.env.DEFAULT_PHONE_COUNTRY_CODE || '57';
    if (digits.length <= 10) {
      // Evitar duplicar si ya empieza por el código
      if (!digits.startsWith(defaultCountry)) {
        digits = `${defaultCountry}${digits}`;
      }
    }

    // Construir destinatario; preferir usar getNumberId si está disponible en esta versión
    let destinatario = null;
    try {
      if (client && typeof client.getNumberId === 'function') {
        const numberId = await client.getNumberId(digits);
        if (numberId && numberId._serialized) {
          destinatario = numberId._serialized;
        }
      }
    } catch (e) {
      // ignore and fallback to direct form
      console.warn('getNumberId falló, se usará formato directo:', e && e.message);
    }

    if (!destinatario) {
      destinatario = `${digits}@c.us`;
    }

    // Asegurarse de que el cliente esté listo (esperar al evento 'ready')
    try {
      // esperar a que la promesa se resuelva (timeout razonable de 10s)
      if (clientReadyPromise) {
        await Promise.race([
          clientReadyPromise,
          new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout esperando cliente WhatsApp listo')), 10000))
        ])
      }
    } catch (readyErr) {
      // Si el cliente no llega a estar listo, informar con claridad
      const err = new Error('Cliente WhatsApp no listo: ' + (readyErr && readyErr.message));
      err.code = 'WHATSAPP_NOT_READY'
      throw err
    }

    // Enviar mensaje
    let msg;
    try {
      msg = await client.sendMessage(destinatario, texto);
    } catch (sendErr) {
      // Detectar error conocido y lanzar uno más descriptivo
      if (sendErr && /No LID for user/i.test(sendErr.message)) {
        const err = new Error('Número no registrado en WhatsApp o formato inválido: ' + numero);
        err.code = 'WHATSAPP_NO_LID';
        throw err;
      }

      // Errores internos de evaluation (puppeteer) a menudo indican que la página
      // de WhatsApp Web no está en el estado esperado. Proveer una guía al operador.
      if (sendErr && /Cannot read properties of undefined/i.test(sendErr.message)) {
        const err = new Error('Error interno al comunicarse con WhatsApp Web. Intente reiniciar la sesión (reconectar QR) o revisar que el cliente esté autenticado. Detalle: ' + sendErr.message);
        err.code = 'WHATSAPP_INTERNAL_EVAL_ERROR'
        throw err;
      }

      throw sendErr;
    }
    return msg;
  } catch (err) {
    console.error('whatsapp.enviarMensaje error:', err);
    throw err;
  }
}

module.exports = { iniciarWhatsApp, obtenerQR, enviarMensaje };

// Desconectar / eliminar la sesión local para forzar regeneración de QR
const fs = require('fs');
const path = require('path');

async function desconectarWhatsApp() {
  try {
    // intentar cerrar sesión si existe cliente
    if (client) {
      // Remover listeners para evitar que eventos internos intenten usar una
      // conexión a Puppeteer que vamos a cerrar (evita ProtocolError en muchos casos)
      try { client.removeAllListeners(); } catch (e) { /* ignorar */ }

      try { await client.logout(); } catch (e) { console.warn('logout error (ignorado):', e && e.message ? e.message : e); }
      try { await client.destroy(); } catch (e) { console.warn('destroy error (ignorado):', e && e.message ? e.message : e); }
    }

    client = null;
    qrActual = null;
    clientReadyPromise = null;
    isReady = false;

    // Borrar carpeta de LocalAuth para este clientId (si existe)
    try {
      const authBase = path.join(process.cwd(), '.wwebjs_auth');
      const clientDir = path.join(authBase, 'biblioteca');
      if (fs.existsSync(clientDir)) {
        // Node 14+ usar rmSync recursivo; si no está disponible, usar rmdirSync
        try {
          fs.rmSync(clientDir, { recursive: true, force: true });
        } catch (e) {
          try { fs.rmdirSync(clientDir, { recursive: true }); } catch (err) { /* ignorar */ }
        }
      }
    } catch (e) {
      console.warn('No se pudo eliminar carpeta de sesión LocalAuth:', e && e.message);
    }

    // NOTA: No reiniciamos automáticamente el cliente aquí para evitar que
    // se genere un QR inmediatamente tras desconexión. El frontend puede
    // solicitar manualmente un nuevo QR si el operador pulsa "Generar QR".

    return true;
  } catch (err) {
    console.error('Error en desconectarWhatsApp:', err);
    throw err;
  }
}

function estadoWhatsApp() {
  return { connected: !!isReady, hasQR: !!qrActual };
}

module.exports = { iniciarWhatsApp, obtenerQR, enviarMensaje, desconectarWhatsApp, estadoWhatsApp };
