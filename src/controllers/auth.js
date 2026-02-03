const Usuario = require("../models/auth");
const { generarContrasenaTemporaria } = require("../utils/password");
const { enviarCorreo } = require("../utils/emailService");

const authController = {
  
  verify: (req, res) => {
    // Si el middleware checkAuth permitió pasar, significa que está autenticado
    if (req.session && req.session.isAuthenticated) {
      return res.status(200).json({ 
        autenticado: true,
        usuario: {
          id: req.session.userId,
          nombre: req.session.nombre
        }
      });
    }
    return res.status(401).json({ autenticado: false });
  },

  login: async (req, res) => {
    const { correo, contrasena } = req.body;

    try {
      const usuario = await Usuario.obtenerPorCorreo(correo);

      if (!usuario) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }
      

      // Validar contraseña 
      if (usuario.contrasena !== contrasena) {
        return res.status(401).json({ mensaje: "Contraseña incorrecta" });
      }

      //guardar datos en session
      req.session.userId = usuario.id; 
      req.session.nombre = usuario.nombre;
      req.session.isAuthenticated = true;

      console.log('Usuario autenticado:', usuario.id);



      res.status(200).json({
        mensaje: "Inicio de sesión exitoso",
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error del servidor" });
    }
  },

  forgotPassword: async (req, res) => {
    const { correo } = req.body;

    try {
      // Validar que se envió el usuario
      if (!correo) {
        return res.status(400).json({ mensaje: "El usuario es requerido" });
      }

      // Buscar usuario por correo (que es el usuario en login)
      const usuario = await Usuario.obtenerPorCorreo(correo);

      if (!usuario) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      // Generar contraseña temporal
      const contrasenaTemporal = generarContrasenaTemporaria(12);

      // Actualizar la contraseña en la BD
      const actualizado = await Usuario.actualizarContrasena(usuario.id, contrasenaTemporal);

      if (!actualizado) {
        return res.status(500).json({ mensaje: "No se pudo actualizar la contraseña" });
      }

      // Obtener el correo SMTP de la institución para enviar desde ahí
      const db = require("../config/db");
      const [institucion] = await db.query("SELECT smtp_correo, nombrePlataforma FROM institucion LIMIT 1");
      
      if (!institucion || !institucion[0] || !institucion[0].smtp_correo) {
        return res.status(500).json({ mensaje: "No hay correo SMTP de institución configurado" });
      }

      const smtpCorreo = institucion[0].smtp_correo;
      const nombrePlataforma = institucion[0].nombrePlataforma || "Sistema de Gestión de Biblioteca";

      // Enviar correo con la nueva contraseña al correo SMTP de la institución
      const htmlCorreo = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Recuperación de Contraseña</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>Se ha generado una contraseña temporal para tu cuenta de administrador. Úsala para iniciar sesión:</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Usuario:</strong> ${usuario.correo}<br/>
              <strong>Contraseña temporal:</strong><br/>
              <code style="font-size: 16px; font-weight: bold; color: #333;">${contrasenaTemporal}</code>
            </div>
            <p>Por favor, cambia esta contraseña una vez que inicies sesión en tu perfil.</p>
            <p>Si no solicitaste esta recuperación, ignora este mensaje.</p>
            <br/>
            <p>Saludos,<br/>${usuario.nombre}</p>
          </body>
        </html>
      `;

      await enviarCorreo({
        destinatario: smtpCorreo,
        asunto: `Recuperación de Contraseña - ${usuario.nombre}`,
        html: htmlCorreo,
        mensaje: `Tu contraseña temporal es: ${contrasenaTemporal}`
      });

      res.status(200).json({ 
        mensaje: "Se ha enviado una contraseña temporal al correo configurado" 
      });

    } catch (error) {
      console.error('Error en forgotPassword:', error);
      res.status(500).json({ mensaje: "Error del servidor" });
    }
  },

  logout: (req, res) => {
    // ESTA LÍNEA DEBE DESTRUIR req.session.isAuthenticated
    req.session.destroy(err => {
        if (err) {
            console.error('Error al intentar destruir la sesión:', err);
            // Ya que estás usando fetch, podrías responder con 500
            return res.status(500).json({ success: false, message: 'Fallo al cerrar sesión' }); 
        }
        
    // Si la sesión se destruye correctamente, limpiar la cookie de sesión en el navegador
    try {
      // Nombre por defecto de la cookie de express-session es 'connect.sid'
      res.clearCookie('connect.sid');
    } catch (cookieErr) {
      console.warn('No se pudo limpiar cookie de sesión:', cookieErr);
    }

    // Responder con 204 No Content
    res.status(204).end(); // 204 No Content
    });
},
};

module.exports = authController;
