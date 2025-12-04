const modelos = require('../models/perfil');
const db = require('../config/db');

// -------------------- INSTITUCIÓN --------------------
const obtenerInstitucion = async (req, res) => {
  try {
    const institucion = await modelos.obtenerInstitucion();
    res.json({ ok: true, data: institucion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener datos', error: err.message });
  }
};

const guardarInstitucion = async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    // si viene un archivo, filename; si no, undefined => dejar que el modelo preserve el logo
    const logo = req.file ? req.file.filename : undefined;

    // Usar la función del modelo `guardarInstitucion` que preserva campos cuando no vienen
    const payload = { nombre, telefono, direccion };
    if (logo !== undefined) payload.logo = logo;

    const saved = await modelos.guardarInstitucion(payload);
    res.json({ ok: true, mensaje: 'Institución guardada', data: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error al guardar datos', error: err.message });
  }
};

// -------------------- USUARIO --------------------
const cambiarCorreo = async (req, res) => {
  try {
    const usuarioId = req.session?.userId;
    if (!usuarioId) return res.status(401).json({ ok: false, message: "No autenticado" });

    const { nombreUsuario, correoUsuario } = req.body;
    if (!nombreUsuario || !correoUsuario) return res.status(400).json({ ok: false, message: "Faltan datos" });

    // actualizar ambos campos (nombre y correo)
    await modelos.actualizarNombre(usuarioId, nombreUsuario);
    await modelos.actualizarCorreo(usuarioId, correoUsuario);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error cambiarCorreo:', error);
    res.status(500).json({ ok: false, message: "Error general", error: error.message });
  }
};

const cambiarContrasena = async (req, res) => {
  try {
    const usuarioId = req.session?.userId;
    const { actual, nueva } = req.body;
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });
    if (!actual || !nueva) return res.status(400).json({ mensaje: "Faltan datos" });

    const usuario = await modelos.obtenerUsuarioPorId(usuarioId);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    if (usuario.contrasena !== actual) return res.status(400).json({ mensaje: "Contraseña incorrecta" });

    await modelos.actualizarContrasena(usuarioId, nueva);
    res.json({ mensaje: "Contraseña cambiada correctamente" });
  } catch (error) {
    console.error('Error cambiarContrasena:', error);
    res.status(500).json({ mensaje: "Error general", error: error.message });
  }
};

// Obtener datos del usuario autenticado
const obtenerUsuario = async (req, res) => {
  try {
    const usuarioId = req.session?.userId;
    if (!usuarioId) return res.status(401).json({ ok: false, message: 'No autenticado' });

    const usuario = await modelos.obtenerUsuarioPorId(usuarioId);
    if (!usuario) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });

    res.json({ ok: true, data: usuario });
  } catch (err) {
    console.error('Error obtenerUsuario:', err);
    res.status(500).json({ ok: false, message: 'Error al obtener usuario', error: err.message });
  }
};



// -------------------- MULTA --------------------
// Obtener configuración de multa
const obtenerMulta = async (req, res) => {
  try {
    const multa = await modelos.obtenerMulta();
    res.json({ ok: true, data: multa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener configuración de multa', error: err.message });
  }
};

// Guardar configuración de multa
const guardarMulta = async (req, res) => {
  try {
    const { valor_multa, dias_tolerancia } = req.body;
    const saved = await modelos.guardarMulta({ valor_multa, dias_tolerancia });
    res.json({ ok: true, mensaje: 'Configuración de multa guardada', data: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error al guardar configuración de multa', error: err.message });
  }
};


// -------------------- PERSONALIZACIÓN --------------------
const guardarPersonalizacion = async (req, res) => {
  try {
    const {
      nombrePlataforma,
      eslogan,
      colorPrimario,
      colorSecundario,
      colorAcento
    } = req.body;

    const payload = {
      nombrePlataforma,
      eslogan,
      colorPrimario,
      colorSecundario,
      colorAcento
    };

    const saved = await modelos.guardarPersonalizacion(payload);

    res.json({ ok: true, mensaje: 'Personalización guardada', data: saved });
  } catch (err) {
    console.error('Error en guardarPersonalizacion:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al guardar personalización', error: err.message });
  }
};

const obtenerPersonalizacion = async (req, res) => {
  try {
    const data = await modelos.obtenerPersonalizacion();
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error obtenerPersonalizacion:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al cargar personalización', error: err.message });
  }
};



module.exports = {
  obtenerInstitucion,
  guardarInstitucion,
  cambiarCorreo,
  cambiarContrasena,
  obtenerUsuario,
  obtenerMulta,
  guardarMulta,
  guardarPersonalizacion,
 obtenerPersonalizacion,

};
