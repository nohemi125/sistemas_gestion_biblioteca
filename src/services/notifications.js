const { enviarCorreo, plantillaRecordatorio, plantillaMulta } = require('../utils/emailService');
const whatsapp = require('./whatsapp');

/**
 * Orquesta el envío de notificaciones: primero email (await), luego WhatsApp en background.
 */
async function enviarRecordatorio(prestamo, miembro, options = {}) {
  const fechaDevolucion = new Date(prestamo.fecha_devolucion).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = plantillaRecordatorio({
    nombreMiembro: prestamo.nombre_miembro,
    tituloLibro: prestamo.titulo_libro,
    fechaDevolucion,
    idPrestamo: prestamo.id_prestamo || prestamo.id
  });

  // Custom mensaje si fue proporcionado desde frontend
  const customMensaje = options.mensaje || options.customMensaje || null;

  // Determinar canales solicitados
  let via = (options.via || '').toString().toLowerCase();
  if (!via) {
    if (options.canales && typeof options.canales === 'object') {
      const { email, whatsapp: w } = options.canales;
      if (email && !w) via = 'email';
      else if (!email && w) via = 'whatsapp';
      else via = 'both';
    } else {
      via = 'both';
    }
  }

  // Email (si fue solicitado)
  if (via === 'both' || via === 'email') {
    if (miembro.email) {
      await enviarCorreo({
        destinatario: miembro.email,
        asunto: '📚 Recordatorio de Devolución de Libro',
        mensaje: customMensaje ? customMensaje : `Hola ${prestamo.nombre_miembro}, te recordamos que debes devolver "${prestamo.titulo_libro}" el ${fechaDevolucion}.`,
        html: customMensaje ? `<p>${customMensaje}</p>` : html
      });
      console.log('Recordatorio: email enviado a', miembro.email);
    } else {
      console.log('Recordatorio: email no enviado, miembro sin email');
    }
  }

  // WhatsApp (si fue solicitado)
  if (via === 'both' || via === 'whatsapp') {
    if (miembro.celular) {
      const textoWpp = customMensaje ? customMensaje : `Hola ${prestamo.nombre_miembro}, recuerda devolver "${prestamo.titulo_libro}" el ${fechaDevolucion}. - Biblioteca`;
      whatsapp.enviarMensaje(miembro.celular, textoWpp)
        .then(() => console.log('WhatsApp enviado a', miembro.celular))
        .catch(err => console.error('Error al enviar WhatsApp a', miembro.celular, err));
    } else {
      console.log('Recordatorio: WhatsApp no enviado, miembro sin celular');
    }
  }
}

async function enviarMulta(prestamo, miembro, monto_multa, options = {}) {
  const fechaDevolucion = new Date(prestamo.fecha_devolucion);
  const fechaFormateada = fechaDevolucion.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const diasRetraso = Math.ceil((new Date() - fechaDevolucion) / (1000 * 60 * 60 * 24));

  const html = plantillaMulta({
    nombreMiembro: prestamo.nombre_miembro,
    tituloLibro: prestamo.titulo_libro,
    diasRetraso,
    montoMulta: parseFloat(monto_multa),
    idPrestamo: prestamo.id_prestamo || prestamo.id
  });

  const customMensaje = options.mensaje || options.customMensaje || null;

  // Determinar canales solicitados
  let via = (options.via || '').toString().toLowerCase();
  if (!via) {
    if (options.canales && typeof options.canales === 'object') {
      const { email, whatsapp: w } = options.canales;
      if (email && !w) via = 'email';
      else if (!email && w) via = 'whatsapp';
      else via = 'both';
    } else {
      via = 'both';
    }
  }

  // Email
  if (via === 'both' || via === 'email') {
    if (miembro.email) {
      await enviarCorreo({
        destinatario: miembro.email,
        asunto: '⚠️ Aviso de Multa por Retraso - Biblioteca',
        mensaje: customMensaje ? customMensaje : `Estimado/a ${prestamo.nombre_miembro}, tienes ${diasRetraso} días de retraso en la devolución de "${prestamo.titulo_libro}". Se ha generado una multa de $${parseFloat(monto_multa).toFixed(2)}.`,
        html: customMensaje ? `<p>${customMensaje}</p>` : html
      });
      console.log('Multa: email enviado a', miembro.email);
    } else {
      console.log('Multa: email no enviado, miembro sin email');
    }
  }

  // WhatsApp
  if (via === 'both' || via === 'whatsapp') {
    if (miembro.celular) {
      const textoWpp = customMensaje ? customMensaje : `Estimado/a ${prestamo.nombre_miembro}, tienes ${diasRetraso} días de retraso con el libro "${prestamo.titulo_libro}". Multa: $${parseFloat(monto_multa).toFixed(2)}.`;
      whatsapp.enviarMensaje(miembro.celular, textoWpp)
        .then(() => console.log('WhatsApp (multa) enviado a', miembro.celular))
        .catch(err => console.error('Error al enviar WhatsApp (multa) a', miembro.celular, err));
    } else {
      console.log('Multa: WhatsApp no enviado, miembro sin celular');
    }
  }
}

module.exports = {
  enviarRecordatorio,
  enviarMulta
};
