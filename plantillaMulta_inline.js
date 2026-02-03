// Plantilla de Multa con estilos inline
const plantillaMulta = async ({ nombreMiembro, tituloLibro, diasRetraso, montoMulta, idPrestamo }) => {
  const perfilModel = require('../models/perfil');
  
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
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
        
        <div style="background-color: #c82333; color: white; padding: 25px; text-align: left;">
          <h2 style="margin: 0 0 8px 0; font-size: 24px;">⚠️ Aviso de Multa por Retraso</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">${nombreInst}</p>
        </div>

        <div style="padding: 30px;">
          <p style="margin: 0 0 15px 0;">Estimado/a <strong>${nombreMiembro}</strong>,</p>

          <p style="margin: 0 0 15px 0;">Hemos detectado que uno de tus préstamos presenta retraso en la fecha de devolución. A continuación encontrarás los detalles y el monto generado.</p>

          <div style="background-color: #f8f9fa; border-left: 4px solid #c82333; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 8px 0;"><strong>📖 Libro:</strong> ${tituloLibro}</p>
            <p style="margin: 8px 0;"><strong>#️⃣ Préstamo:</strong> #P${String(idPrestamo).padStart(3, '0')}</p>
            <p style="margin: 8px 0;"><strong>⏰ Días de retraso:</strong> ${diasRetraso} días</p>
          </div>

          <h3 style="margin: 20px 0 15px 0; font-size: 16px; color: #333;">Multa Generada</h3>
          <div style="background-color: #fff3f3; border: 2px solid #c82333; padding: 20px; text-align: center; margin: 20px 0; border-radius: 6px;">
            <div style="font-size: 28px; color: #c82333; font-weight: bold;">💰 $${montoMulta.toFixed(2)}</div>
          </div>

          <p style="margin: 0 0 15px 0;">Por favor, acércate a la biblioteca para regularizar la situación. Opciones sugeridas:</p>
          <ul style="padding-left: 25px; margin: 15px 0;">
            <li style="margin: 8px 0;">Devolver el libro en la biblioteca (Lun-Vie 9:00-17:00).</li>
            <li style="margin: 8px 0;">Realizar el pago correspondiente de la multa en caja o por los medios habilitados.</li>
          </ul>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #333;">ℹ️ Información importante:</strong> Si ya realizaste el pago, por favor responde a este correo indicando el número de préstamo y, si tienes, el comprobante.
          </div>

          <p style="margin: 0 0 15px 0;"><strong>Contacto:</strong> ${telefonoInst || 'N/A'} ${correoInst ? '| ' + correoInst : ''}</p>

          <p style="margin: 0 0 20px 0;">Gracias por tu atención.</p>

          <div style="border-top: 1px solid #ddd; padding-top: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 5px 0;">Este es un mensaje automático, por favor no respondas directamente a este correo.</p>
            <p style="margin: 5px 0;">${nombreInst}${direccionInst ? ' — ' + direccionInst : ''}${telefonoInst ? ' — Tel: ' + telefonoInst : ''}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = plantillaMulta;
