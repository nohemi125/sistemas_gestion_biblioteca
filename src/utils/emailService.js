const nodemailer = require('nodemailer');
const perfilModel = require('../models/perfil');

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
    // Helper: convertir HTML a texto plano básico conservando saltos de párrafo
    const stripHtmlToText = (inputHtml) => {
      if (!inputHtml) return '';
      let t = inputHtml;
      // reemplazar algunos contenedores por dobles CRLF para separar párrafos
      t = t.replace(/<\s*br\s*\/?>/gi, '\r\n');
      t = t.replace(/<\s*\/p\s*>/gi, '\r\n\r\n');
      t = t.replace(/<\s*\/div\s*>/gi, '\r\n\r\n');
      t = t.replace(/<\s*li\s*>/gi, '\r\n - ');
      t = t.replace(/<[^>]+>/g, '');
      // decode common entities
      t = t.replace(/&nbsp;/g, ' ')
           .replace(/&amp;/g, '&')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>')
           .replace(/&quot;/g, '"');
      // normalize whitespace and CRLF
      t = t.replace(/\r\n|\r|\n/g, '\r\n');
      // remove markdown-style asterisks used for emphasis (e.g. *texto*)
      t = t.replace(/\*(.*?)\*/g, '$1');
      // collapse sequences of 3+ newlines into two (CRLF x2)
      t = t.replace(/(\r\n){3,}/g, '\r\n\r\n');
      // trim lines
      t = t.split('\r\n').map(s => s.trim()).filter(Boolean).join('\r\n\r\n');
      return t;
    };

    // Generar texto plano: preferir 'mensaje' si se proporcionó, si no derivar del HTML
    let textoPlano = '';
    if (mensaje && mensaje.toString().trim()) {
      textoPlano = mensaje.toString();
    } else if (html) {
      textoPlano = stripHtmlToText(html);
    }
    // Si el texto aún contiene asteriscos por otros motivos, limpiarlos
    textoPlano = textoPlano.replace(/\*(.*?)\*/g, '$1');

    const opciones = {
      from: `"Sistema de Biblioteca" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      text: textoPlano,
    };

    console.log('[emailService] enviarCorreo -> destinatario:', destinatario, 'asunto:', asunto);
    console.log('[emailService] texto plano (preview):', (textoPlano || '').slice(0, 400).replace(/\r\n/g, '\\n'));

    // Si se proporciona HTML, agregarlo (los clientes que soporten HTML lo usarán)
    if (html) {
      opciones.html = html;
    }

    const info = await transporter.sendMail(opciones);
    console.log('[emailService] Correo enviado:', info && info.messageId ? info.messageId : info);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[emailService] Error al enviar correo:', error && error.message ? error.message : error);
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
  // Algunas filas pueden usar `nombre`, otras `nombreInstitucion` o `nombrePlataforma`.
  const nombreInst = (institucion && (institucion.nombre || institucion.nombreInstitucion || institucion.nombrePlataforma)) || 'Biblioteca Municipal';
  const telefonoInst = (institucion && (institucion.telefono || institucion.telefonoInstitucion || institucion.telefono_institucion)) || '';
  const correoInst = (institucion && (institucion.smtp_correo || institucion.smtpCorreo || institucion.correo || institucion.email)) || '';
  const direccionInst = (institucion && institucion.direccion) || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        .button { background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recordatorio de Devolución</h1>
          <div style="font-size:14px;margin-top:6px;opacity:0.95">${nombreInst}</div>
        </div>
        <div class="content">
          <p>Hola <strong>${nombreMiembro}</strong>,</p>
          
          <p>Te recordamos que tienes un libro pendiente de devolución en nuestra biblioteca.</p>
          
          <div class="warning">
            <strong>📖 Libro:</strong> ${tituloLibro}<br>
            <strong>📅 Fecha de devolución:</strong> ${fechaDevolucion}<br>
            <strong>#️⃣ Préstamo:</strong> #P${String(idPrestamo).padStart(3, '0')}
          </div>
          
          <p>Por favor, asegúrate de devolver el libro antes de la fecha indicada para evitar multas.</p>
          
          <p>Si ya has devuelto el libro, ignora este mensaje.</p>
          
          <p>¡Gracias por utilizar nuestros servicios!</p>
          
          <p><em>${nombreInst}</em></p>
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f6f8; padding: 20px; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .header { background-color: #c82333; color: white; padding: 18px 22px; text-align: left; }
        .header h1 { margin: 0; font-size: 20px; }
        .brand { font-size: 13px; opacity: 0.9; margin-top: 6px; }
        .content { padding: 22px; color: #333; }
        .footer { text-align: center; padding: 16px 18px; font-size: 12px; color: #6c757d; background: #f8f9fa; }
        .notice { background: #fff3f3; border-left: 4px solid #e55353; padding: 14px; margin: 14px 0; border-radius:4px; }
        .amount { font-size: 22px; color: #c82333; font-weight: 700; text-align: center; margin: 14px 0; }
        .details { background: #ffffff; border: 1px solid #eef0f2; padding: 12px; border-radius: 6px; }
        .details b { display:inline-block; width:140px; }
        ul { padding-left: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Aviso de Multa por Retraso</h1>
          <div class="brand">${nombreInst}</div>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreMiembro}</strong>,</p>

          <p>Hemos detectado que uno de tus préstamos presenta retraso en la fecha de devolución. A continuación encontrarás los detalles y el monto generado.</p>

          <div class="details">
            <p><b>📖 Libro:</b> ${tituloLibro}</p>
            <p><b>#️⃣ Préstamo:</b> #P${String(idPrestamo).padStart(3, '0')}</p>
            <p><b>⏰ Días de retraso:</b> ${diasRetraso} días</p>
          </div>

          <h3 style="margin-top:14px; margin-bottom:8px;">Multa generada</h3>
          <div class="amount">💰 $${montoMulta.toFixed(2)}</div>

          <p>Por favor, acércate a la biblioteca para regularizar la situación. Opciones sugeridas:</p>
          <ul>
            <li>Devolver el libro en la biblioteca (Lun-Vie 9:00-17:00).</li>
            <li>Realizar el pago correspondiente de la multa en caja o por los medios habilitados.</li>
          </ul>

          <div class="notice">
            Si ya realizaste el pago, por favor responde a este correo indicando el número de préstamo y, si tienes, el comprobante.
          </div>

          <p>Contacto: ${telefonoInst ? telefonoInst : ''} ${correoInst ? ' • ' + correoInst : ''}</p>

          <p>Gracias por tu atención.</p>

          <p><em>${nombreInst}${direccionInst ? ' — ' + direccionInst : ''}</em></p>
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
};
