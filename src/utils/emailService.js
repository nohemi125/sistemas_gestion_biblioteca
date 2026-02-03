const nodemailer = require('nodemailer');
const perfilModel = require('../models/perfil');
const juice = require('juice');


// Configuración del transportador de correo (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
});

// Verificar conexión al servidor SMTP al cargar el módulo
transporter.verify().then(() => {
  console.log('[emailService] SMTP ready (transporter verified)')
}).catch(err => {
  console.warn('[emailService] SMTP verification failed:', err && err.message ? err.message : err)
});

/**
 * Función para enviar correos electrónicos
 * @param {Object} opciones - Opciones del correo
 * @param {string} opciones.destinatario - Email del destinatario
 * @param {string} opciones.asunto - Asunto del correo
 * @param {string} opciones.mensaje - Mensaje en texto plano
 * @param {string} opciones.html - Mensaje en formato HTML (opcional)
 * @returns {Promise} - Resultado del envío
 */
const enviarCorreo = async ({ destinatario, asunto, mensaje, html }) => {
  try {
    // Helper: convertir HTML a texto plano
    const stripHtmlToText = (inputHtml) => {
      if (!inputHtml) return '';
      let t = inputHtml;
      t = t.replace(/<br\s*\/?>/gi, '\n');
      t = t.replace(/<\/p>/gi, '\n\n');
      t = t.replace(/<\/div>/gi, '\n\n');
      t = t.replace(/<li>/gi, '\n - ');
      t = t.replace(/<[^>]+>/g, '');
      return t;
    };

    let textoPlano = '';

    // Si NO hay html, generar texto plano
    if (!html) {
      if (mensaje && mensaje.trim()) {
        textoPlano = mensaje.trim();
      } else {
        textoPlano = stripHtmlToText(html);
      }
    }

    const opciones = {
      from: `"Sistema de Biblioteca" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
    };

    // SOLO enviar texto plano si NO hay HTML
    if (!html) {
      opciones.text = textoPlano;
    }

    // Si hay HTML → procesar con juice y enviar como HTML
    if (html) {
      try {
        opciones.html = juice(html);
        console.log('[emailService] HTML procesado con juice correctamente para:', destinatario);
      } catch (juiceError) {
        console.error('[emailService] Error procesando HTML con juice:', juiceError.message);
        // Si juice falla, usar el HTML sin procesar
        opciones.html = html;
      }
    }

    const info = await transporter.sendMail(opciones);
    console.log('[emailService] Correo enviado a:', destinatario, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('[emailService] Error al enviar correo:', error.message);
    throw error;
  }
};


/**
 * Plantilla HTML para recordatorio de devolución
 */
const plantillaRecordatorio = async ({ nombreMiembro, tituloLibro, fechaDevolucion, idPrestamo }) => {
  // intentar obtener datos de la institución para incluirlos en el pie del email
  let institucion = null;
  try {
    institucion = await perfilModel.obtenerInstitucion();
  } catch (e) {
    institucion = null;
  }
  // Priorizar cualquier campo que pueda almacenar el nombre visible de la institución.
  const nombreInst = (institucion && (institucion.nombre || institucion.nombreInstitucion || institucion.nombrePlataforma)) || 'Biblioteca Municipal';
  const telefonoInst = (institucion && (institucion.telefono || institucion.telefonoInstitucion || institucion.telefono_institucion)) || '';
  const correoInst = (institucion && (institucion.smtp_correo || institucion.smtpCorreo || institucion.correo || institucion.email)) || '';
  const direccionInst = (institucion && institucion.direccion) || '';

 return `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background-color: #17a2b8; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0 0 8px 0; font-size: 24px;">📚 Recordatorio de Devolución</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">${nombreInst}</p>
        </div>

        <div style="padding: 30px;">
          <p style="margin: 0 0 15px 0;">Hola <strong>${nombreMiembro}</strong>,</p>
          
          <p style="margin: 0 0 15px 0;">Te recordamos que tienes un libro pendiente de devolución en nuestra biblioteca.</p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>📖 Libro:</strong> ${tituloLibro}</p>
            <p style="margin: 5px 0;"><strong>📅 Fecha de devolución:</strong> ${fechaDevolucion}</p>
            <p style="margin: 5px 0;"><strong>#️⃣ Préstamo:</strong> #P${String(idPrestamo).padStart(3, '0')}</p>
          </div>
          
          <p style="margin: 0 0 15px 0;">Por favor, asegúrate de devolver el libro antes de la fecha indicada para evitar multas.</p>
          
          <p style="margin: 0 0 15px 0;">Si ya has devuelto el libro, ignora este mensaje.</p>
          
          <p style="margin: 0 0 15px 0;">¡Gracias por utilizar nuestros servicios!</p>
          
          <p style="margin: 0 0 20px 0;"><em>${nombreInst}</em></p>
          
          <div style="border-top: 1px solid #ddd; padding-top: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 5px 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p style="margin: 5px 0;">${nombreInst}${direccionInst ? ' — ' + direccionInst : ''}${telefonoInst ? ' — Tel: ' + telefonoInst : ''}${correoInst ? ' — ' + correoInst : ''}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Plantilla HTML para multa por retraso
 */
const plantillaMulta = async ({ nombreMiembro, tituloLibro, diasRetraso, montoMulta, idPrestamo }) => {
  // intentar obtener datos de la institución
  let institucion = null;
  try {
    institucion = await perfilModel.obtenerInstitucion();
  } catch (e) {
    institucion = null;
  }
  // Priorizar cualquier campo que pueda almacenar el nombre visible de la institución.
  const nombreInst = (institucion && (institucion.nombre || institucion.nombreInstitucion || institucion.nombrePlataforma)) || 'Biblioteca Municipal';
  const telefonoInst = (institucion && institucion.telefono) || '';
  const correoInst = (institucion && (institucion.smtp_correo || institucion.smtpCorreo || institucion.correo || institucion.email)) || '';
  const direccionInst = (institucion && institucion.direccion) || '';

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; }
        .header { background-color: #c82333; color: white; padding: 20px; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px; }
        .details { background: #f8f9fa; border-left: 4px solid #c82333; padding: 15px; margin: 20px 0; }
        .details p { margin: 8px 0; }
        .details strong { display: inline-block; width: 160px; }
        .amount-box { background: #fff3f3; border: 2px solid #c82333; padding: 20px; text-align: center; margin: 20px 0; border-radius: 6px; }
        .amount { font-size: 28px; color: #c82333; font-weight: bold; }
        .notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .notice strong { color: #333; }
        .footer { text-align: center; padding: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .footer p { margin: 5px 0; }
        h3 { color: #333; margin: 20px 0 10px 0; font-size: 16px; }
        ul { padding-left: 25px; margin: 15px 0; }
        ul li { margin: 8px 0; }
        p { margin: 12px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Aviso de Multa por Retraso</h1>
          <p>${nombreInst}</p>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreMiembro}</strong>,</p>

          <p>Hemos detectado que uno de tus préstamos presenta retraso en la fecha de devolución. A continuación encontrarás los detalles y el monto generado.</p>

          <div class="details">
            <p><strong>📖 Libro:</strong> ${tituloLibro}</p>
            <p><strong>#️⃣ Préstamo:</strong> #P${String(idPrestamo).padStart(3, '0')}</p>
            <p><strong>⏰ Días de retraso:</strong> ${diasRetraso} días</p>
          </div>

          <h3>Multa Generada</h3>
          <div class="amount-box">
            <div class="amount">💰 $${montoMulta.toFixed(2)}</div>
          </div>

          <p>Por favor, acércate a la biblioteca para regularizar la situación. Opciones sugeridas:</p>
          <ul>
            <li>Devolver el libro en la biblioteca (Lun-Vie 9:00-17:00).</li>
            <li>Realizar el pago correspondiente de la multa en caja o por los medios habilitados.</li>
          </ul>

          <div class="notice">
            <strong>ℹ️ Información importante:</strong> Si ya realizaste el pago, por favor responde a este correo indicando el número de préstamo y, si tienes, el comprobante.
          </div>

          <p><strong>Contacto:</strong> ${telefonoInst || 'N/A'} ${correoInst ? '| ' + correoInst : ''}</p>

          <p>Gracias por tu atención.</p>

          <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas directamente a este correo.</p>
            <p>${nombreInst}${direccionInst ? ' — ' + direccionInst : ''}${telefonoInst ? ' — Tel: ' + telefonoInst : ''}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Plantilla HTML para notificación de beneficio
 */
const plantillaBeneficio = async ({ nombreMiembro, tituloBeneficio, descripcionBeneficio }) => {
  // intentar obtener datos de la institución
  let institucion = null;
  try {
    institucion = await perfilModel.obtenerInstitucion();
  } catch (e) {
    institucion = null;
  }
  const nombreInst = (institucion && (institucion.nombre || institucion.nombreInstitucion || institucion.nombrePlataforma)) || 'Biblioteca Municipal';
  const telefonoInst = (institucion && institucion.telefono) || '';
  const correoInst = (institucion && (institucion.smtp_correo || institucion.smtpCorreo || institucion.correo || institucion.email)) || '';
  const direccionInst = (institucion && institucion.direccion) || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f6f8; padding: 20px; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .brand { font-size: 13px; opacity: 0.95; margin-top: 8px; }
        .content { padding: 30px; color: #333; }
        .footer { text-align: center; padding: 16px 18px; font-size: 12px; color: #6c757d; background: #f8f9fa; }
        .beneficio-box { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .beneficio-titulo { font-size: 20px; font-weight: 700; color: #667eea; margin-bottom: 10px; }
        .beneficio-descripcion { font-size: 16px; color: #555; line-height: 1.5; }
        .emoji { font-size: 48px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji">🎉</div>
          <h1>¡Felicidades ${nombreMiembro}!</h1>
          <div class="brand">${nombreInst}</div>
        </div>
        <div class="content">
          <p>Has sido seleccionado/a para recibir un beneficio especial por tu excelente participación en nuestra biblioteca.</p>
          
          <div class="beneficio-box">
            <div class="beneficio-titulo">${tituloBeneficio}</div>
            <div class="beneficio-descripcion">${descripcionBeneficio}</div>
          </div>
          
          <p style="text-align: center; font-size: 18px; margin: 20px 0;">🎁 Como reconocimiento, te hemos asignado este beneficio especial. 🥳</p>
          
          <p style="text-align: center; margin-top: 30px;">¡Gracias por ser parte de nuestra comunidad de lectores!</p>
          
          <p style="text-align: center;"><em>${nombreInst}</em></p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          <p style="margin-top:10px;font-size:12px;color:#666">${nombreInst}${direccionInst ? ' — ' + direccionInst : ''}${telefonoInst ? ' — Tel: ' + telefonoInst : ''}${correoInst ? ' — ' + correoInst : ''}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
	enviarCorreo,
	plantillaRecordatorio,
	plantillaMulta,
	plantillaBeneficio,
};
