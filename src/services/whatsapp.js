const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;

async function iniciarWhatsApp() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'biblioteca' }) // sesión local por biblioteca
  });

  client.on('qr', qr => {
    console.log('Escanea este QR con WhatsApp de la biblioteca:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => console.log('WhatsApp Web listo!'));
  client.on('authenticated', () => console.log('Cuenta autenticada'));
  client.on('auth_failure', msg => console.error('Error autenticación:', msg));

  await client.initialize();
  return client;
}

// Código de país por defecto (usa la variable de entorno si está definida)
const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || '57';

function normalizeNumber(numero) {
  if (!numero) return null;
  let n = String(numero).replace(/\D/g, '');
  // eliminar ceros iniciales
  n = n.replace(/^0+/, '');
  // si no comienza con el código por defecto, lo añadimos
  if (!n.startsWith(DEFAULT_COUNTRY_CODE)) {
    n = DEFAULT_COUNTRY_CODE + n;
  }
  return n;
}

async function enviarMensaje(numero, mensaje) {
  const c = await iniciarWhatsApp();
  const normalized = normalizeNumber(numero);
  if (!normalized) throw new Error('Número inválido para WhatsApp: ' + numero);
  const chatId = normalized + '@c.us';
  await c.sendMessage(chatId, mensaje);
}

module.exports = { iniciarWhatsApp, enviarMensaje };
