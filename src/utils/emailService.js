const nodemailer = require('nodemailer');

// Configuración del transportador de correo (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
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
		const opciones = {
			from: `"Sistema de Biblioteca" <${process.env.EMAIL_USER}>`,
			to: destinatario,
			subject: asunto,
			text: mensaje,
		};

		// Si se proporciona HTML, agregarlo
		if (html) {
			opciones.html = html;
		}

		const info = await transporter.sendMail(opciones);
		console.log(' Correo enviado:', info.messageId);
		return { success: true, messageId: info.messageId };
	} catch (error) {
		console.error(' Error al enviar correo:', error);
		throw error;
	}
};

/**
 * Plantilla HTML para recordatorio de devolución
 */
const plantillaRecordatorio = ({ nombreMiembro, tituloLibro, fechaDevolucion, idPrestamo }) => {
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
          
          <p><em>Sistema de Gestión de Biblioteca</em></p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Plantilla HTML para multa por retraso
 */
const plantillaMulta = ({ nombreMiembro, tituloLibro, diasRetraso, montoMulta, idPrestamo }) => {
	return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        .alert { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
        .amount { font-size: 24px; color: #dc3545; font-weight: bold; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Aviso de Multa por Retraso</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreMiembro}</strong>,</p>
          
          <p>Te informamos que tienes un préstamo vencido con días de retraso.</p>
          
          <div class="alert">
            <strong>📖 Libro:</strong> ${tituloLibro}<br>
            <strong>#️⃣ Préstamo:</strong> #P${String(idPrestamo).padStart(3, '0')}<br>
            <strong>⏰ Días de retraso:</strong> ${diasRetraso} días
          </div>
          
          <p><strong>Se ha generado una multa por el retraso:</strong></p>
          
          <div class="amount">
            💰 $${montoMulta.toFixed(2)}
          </div>
          
          <p>Por favor, acércate a la biblioteca lo antes posible para:</p>
          <ul>
            <li>Devolver el libro</li>
            <li>Realizar el pago correspondiente de la multa</li>
          </ul>
          
          <p>Agradecemos tu comprensión y cooperación.</p>
          
          <p><em>Sistema de Gestión de Biblioteca</em></p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
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
