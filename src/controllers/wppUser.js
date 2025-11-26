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

async function enviarMensaje(numero, mensaje) {
  const c = await iniciarWhatsApp();
  // WhatsApp espera el número con formato internacional sin +, por ejemplo: 573001234567
  const chatId = numero.replace(/\D/g, '') + '@c.us';
  await c.sendMessage(chatId, mensaje);
}

module.exports = { enviarMensaje };
