const Usuario = require("../models/auth");

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
