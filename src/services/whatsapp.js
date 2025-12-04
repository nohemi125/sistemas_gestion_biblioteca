const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
let client;
let qrActual = null; // <-- Guardaremos el QR aquí
let clientReadyPromise = null;

async function iniciarWhatsApp() {
  if (client) return client;
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'biblioteca' })
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

  client.on('ready', () => {
    console.log("WhatsApp listo!");
    qrActual = null; // Ya no hace falta QR
  });

  client.initialize();
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
