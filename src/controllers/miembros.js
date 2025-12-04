const Miembro = require('../models/miembros');

// Obtener todos los miembros
const obtenerMiembros = async (req, res) => {
  try {
    const miembros = await Miembro.obtenerTodos();
    res.json(miembros);
  } catch (error) {
    console.error("Error al obtener miembros:", error);
    res.status(500).json({ error: "Error al obtener los miembros" });
  }
};

//  Obtener miembro por ID
const obtenerMiembroPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const miembro = await Miembro.obtenerPorId(id);

    if (!miembro) {
      return res.status(404).json({ mensaje: "Miembro no encontrado" });
    }

    res.json(miembro);
  } catch (error) {
    console.error("Error al obtener miembro:", error);
    res.status(500).json({ error: "Error al obtener el miembro" });
  }
};

//  Crear miembro
const crearMiembro = async (req, res) => {
  try {
    const nuevoMiembro = await Miembro.crear(req.body);
    res.json(nuevoMiembro);
  } catch (error) {
    console.error("Error al crear miembro:", error);
    res.status(500).json({ error: "Error al crear el miembro" });
  }
};

//  Actualizar miembro
const actualizarMiembro = async (req, res) => {
  try {
    const { id } = req.params;
    await Miembro.actualizar(id, req.body);
    res.json({ mensaje: "Miembro actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar miembro:", error);
    res.status(500).json({ error: "Error al actualizar el miembro" });
  }
};

// ✅ Eliminar miembro
const eliminarMiembro = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await Miembro.eliminar(id);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Miembro no encontrado' });
    }

    res.json({ mensaje: 'Miembro eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar miembro:', error);
    if (error && (error.code === 'MIEMBRO_TIENE_PRESTAMOS' || error.message === 'MIEMBRO_TIENE_PRESTAMOS')) {
      return res.status(400).json({ error: 'El miembro tiene préstamos o registros relacionados. No se puede eliminar.' });
    }
    res.status(500).json({ error: 'Error al eliminar el miembro' });
  }
};

// Cambiar estado activo/inactivo de un miembro
const setEstadoMiembro = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body; // esperar { activo: true|false }
    const resultado = await Miembro.setActivo(id, activo ? 1 : 0);
    if (resultado.affectedRows === 0) return res.status(404).json({ mensaje: 'Miembro no encontrado' });
    return res.json({ mensaje: activo ? 'Miembro activado' : 'Miembro inactivado' });
  } catch (err) {
    console.error('Error cambiando estado de miembro:', err);
    res.status(500).json({ error: 'Error cambiando estado de miembro' });
  }
};

//  Buscar miembros (por nombre, email, etc.)
const buscarMiembros = async (req, res) => {
  try {
    const filtro = req.query.filtro || req.query.nombre || req.query.q || '';
    const miembros = await Miembro.buscar(filtro);
    res.json(miembros);
  } catch (error) {
    console.error("Error al buscar miembros:", error);
    res.status(500).json({ error: "Error al buscar miembros" });
  }
};


// Enviar notificación manual a un miembro (email + WhatsApp)
const enviarNotificacionMiembro = async (req, res) => {
  try {
    const { id } = req.params;
    let { asunto, mensaje, via = 'both' } = req.body; // via: 'email' | 'whatsapp' | 'both'
    via = (via || 'both').toString().toLowerCase();

    console.log(`[notificar] id=${id} via=${via} asunto=${!!asunto} mensaje=${!!mensaje}`);

    const miembro = await Miembro.obtenerPorId(id);
    if (!miembro) return res.status(404).json({ error: 'Miembro no encontrado' });

    const emailService = require('../utils/emailService');
    const whatsapp = require('../services/whatsapp');

    const resultados = { email: null, whatsapp: null, solicitado: via };

    // Email
    if (via === 'both' || via === 'email') {
      if (!miembro.email) {
        resultados.email = 'no_email';
      } else if (!asunto || !mensaje) {
        resultados.email = 'faltan_datos';
      } else {
        try {
          await emailService.enviarCorreo({
            destinatario: miembro.email,
            asunto,
            mensaje,
            html: `<p>${mensaje}</p>`
          });
          resultados.email = 'enviado';
        } catch (err) {
          console.error('Error al enviar correo en notificación manual:', err);
          resultados.email = 'error';
        }
      }
    } else {
      resultados.email = 'no_solicitado';
    }

    // WhatsApp
    if (via === 'both' || via === 'whatsapp') {
      if (!miembro.celular) {
        resultados.whatsapp = 'no_celular';
      } else if (!mensaje) {
        resultados.whatsapp = 'faltan_datos';
      } else {
        try {
          await whatsapp.enviarMensaje(miembro.celular, mensaje);
          resultados.whatsapp = 'enviado';
        } catch (err) {
          console.error('Error al enviar WhatsApp en notificación manual:', err);
          resultados.whatsapp = 'error';
        }
      }
    } else {
      resultados.whatsapp = 'no_solicitado';
    }

    return res.json({ mensaje: 'Notificación procesada', resultados });
  } catch (error) {
    console.error('Error en enviarNotificacionMiembro:', error);
    res.status(500).json({ error: 'Error al enviar notificación' });
  }
};



module.exports = {
  obtenerMiembros,
  obtenerMiembroPorId,
  crearMiembro,
  actualizarMiembro,
  eliminarMiembro,
  setEstadoMiembro,
  buscarMiembros,
  enviarNotificacionMiembro
};
