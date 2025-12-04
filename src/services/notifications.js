const { enviarCorreo, plantillaRecordatorio, plantillaMulta } = require('../utils/emailService');
const whatsapp = require('./whatsapp');
const perfilModel = require('../models/perfil');

/**
 * Orquesta el envío de notificaciones: primero email (await), luego WhatsApp en background.
 */
async function enviarRecordatorio(prestamo, miembro, options = {}) {
  const fechaDevolucion = new Date(prestamo.fecha_devolucion).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = await plantillaRecordatorio({
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
      const textoWpp = customMensaje ? customMensaje : await formatWhatsAppRecordatorio(prestamo, fechaDevolucion);
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

  const html = await plantillaMulta({
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
      const textoWpp = customMensaje ? customMensaje : await formatWhatsAppMulta(prestamo, diasRetraso, monto_multa);
      whatsapp.enviarMensaje(miembro.celular, textoWpp)
        .then(() => console.log('WhatsApp (multa) enviado a', miembro.celular))
        .catch(err => console.error('Error al enviar WhatsApp (multa) a', miembro.celular, err));
    } else {
      console.log('Multa: WhatsApp no enviado, miembro sin celular');
    }
  }
}

// Helpers para formatear mensajes de WhatsApp
async function formatWhatsAppRecordatorio(prestamo, fechaDevolucion) {
  const id = prestamo.id_prestamo || prestamo.id || '';
  // Obtener datos de la institución para usar en el pie del mensaje
  let institucion = null;
  try {
    institucion = await perfilModel.obtenerInstitucion();
  } catch (e) {
    institucion = null;
  }
  // Priorizar el nombre real de la institución si existe
  const nombreInst = (institucion && (institucion.nombre || institucion.nombrePlataforma)) || 'Biblioteca Municipal';
  const telefonoInst = (institucion && (institucion.telefono || institucion.telefonoInstitucion || institucion.telefono_institucion)) || '310 123 4567';
  const correoInst = (institucion && (institucion.smtp_correo || institucion.smtpCorreo || institucion.correo || institucion.email)) || 'biblioteca@ejemplo.com';
  const direccionInst = (institucion && institucion.direccion) || '';

  // Plantilla profesional con encabezado, detalles y CTA
  return [
    `*📚 Recordatorio de Devolución—${nombreInst}*`,
    ``,
    `Hola *${prestamo.nombre_miembro}* 👋,`,
    ``,
    `Te recordamos que tienes un libro pendiente de devolución:`,
    `*📖 ${prestamo.titulo_libro}*`,
    `*📅 Fecha de devolución:* ${fechaDevolucion}`,
  
    ``,
    `Por favor entrega el libro en la fecha indicada para evitar recargos. Si necesitas una prórroga, responde a este mensaje indicando cuántos días necesitas.`,
    ``,
    `*¿Necesitas ayuda?*`,
    telefonoInst ? `📞 Tel: ${telefonoInst}` : '',
    correoInst ? `✉️ Correo: ${correoInst}` : '',
    direccionInst ? `📍 Dirección: ${direccionInst}` : '',
    ``,
    `Gracias por usar nuestros servicios.`,
    `_${nombreInst} – Gestión de Préstamos_`
  ].filter(Boolean).join('\n');
}

async function formatWhatsAppMulta(prestamo, diasRetraso, monto) {
  const id = prestamo.id_prestamo || prestamo.id || '';
  // Obtener datos de la institución
  let institucion = null;
  try {
    institucion = await perfilModel.obtenerInstitucion();
  } catch (e) {
    institucion = null;
  }
  // Priorizar el nombre real de la institución si existe
  const nombreInst = (institucion && (institucion.nombre || institucion.nombrePlataforma)) || 'Biblioteca Municipal';
  const telefonoInst = (institucion && (institucion.telefono || institucion.telefonoInstitucion || institucion.telefono_institucion)) || '310 123 4567';
  const correoInst = (institucion && (institucion.smtp_correo || institucion.smtpCorreo || institucion.correo || institucion.email)) || 'biblioteca@ejemplo.com';
  const direccionInst = (institucion && institucion.direccion) || '';

  // Plantilla profesional para multas con detalles y acciones sugeridas
  return [
    `*⚠️ Aviso de Multa por Retraso — ${nombreInst}*`,
    ``,
    `Estimado/a *${prestamo.nombre_miembro}*,`,
    ``,
    `Hemos registrado un retraso de *${diasRetraso} día(s)* en la devolución de:`,
    `*📖 ${prestamo.titulo_libro}*`,
    id ? `*🔖 Préstamo:* P${String(id).padStart(3, '0')}` : '',
    `*💰 Monto de la multa:* $${parseFloat(monto).toFixed(2)}`,
    ``,
    `Para regularizar tu situación puedes:`,
    `• Devolver el libro en la biblioteca (Lun-Vie 9:00-17:00).`,
    `• Responder a este mensaje si necesitas información sobre el pago.`,
    ``,
    telefonoInst ? `📞 Atención: ${telefonoInst}` : '',
    correoInst ? `✉️ ${correoInst}` : '',
    direccionInst ? `📍 ${direccionInst}` : '',
    ``,
    `Si ya realizaste el pago, por favor indícanos el comprobante respondiendo con el número de préstamo.`,
    ``,
    `_Gracias por tu atención._`,
    `_${nombreInst} – Gestión de Préstamos_`
  ].filter(Boolean).join('\n');
}

module.exports = {
  enviarRecordatorio,
  enviarMulta
};
