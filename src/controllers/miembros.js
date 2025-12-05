const Miembro = require('../models/miembros');
const db = require('../config/db');
const PerfilModel = require('../models/perfil');

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

    // Obtener historial de préstamos del miembro (con título de libro)
    const [prestamos] = await db.query(`
      SELECT 
        p.id_prestamo,
        p.id_miembro,
        p.id_libro,
        p.fecha_prestamo,
        p.fecha_devolucion,
        p.estado,
        l.titulo AS titulo_libro,
        CASE 
          WHEN p.fecha_devolucion IS NOT NULL AND p.fecha_devolucion < CURDATE() AND p.estado <> 'Devuelto' THEN DATEDIFF(CURDATE(), p.fecha_devolucion)
          WHEN p.fecha_devolucion IS NULL AND p.estado <> 'Devuelto' AND p.fecha_prestamo < CURDATE() THEN DATEDIFF(CURDATE(), p.fecha_prestamo)
          ELSE 0
        END AS dias_retraso
      FROM prestamos p
      LEFT JOIN libros l ON l.id_libro = p.id_libro
      WHERE p.id_miembro = ?
      ORDER BY p.fecha_prestamo DESC
    `, [id]);

    // Obtener configuración de multa (valor por día y días de tolerancia)
    let multaConf = null;
    try {
      multaConf = await PerfilModel.obtenerMulta();
    } catch (err) {
      console.warn('No se pudo obtener config de multa:', err.message || err);
    }

    // Calcular multas por préstamo (si aplica)
    const multas = [];
    const valorPorDia = multaConf && multaConf.valor_multa ? parseFloat(multaConf.valor_multa) : 0;
    const diasTolerancia = multaConf && multaConf.dias_tolerancia ? parseInt(multaConf.dias_tolerancia) : 0;

    for (const p of prestamos) {
      const dias = Number(p.dias_retraso) || 0;
      const diasCobrar = Math.max(0, dias - diasTolerancia);
      const monto = diasCobrar > 0 && valorPorDia > 0 ? Number((diasCobrar * valorPorDia).toFixed(2)) : 0;
      if (monto > 0) {
        multas.push({
          id_prestamo: p.id_prestamo,
          titulo_libro: p.titulo_libro,
          dias_retraso: dias,
          dias_cobrar: diasCobrar,
          monto
        });
      }
    }

    // Actualmente no existe una tabla de beneficios asignados; devolver array vacío
    const beneficios = [];

    return res.json({ ...miembro, prestamos, multas, beneficios });
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
          // Verificar estado del servicio WhatsApp antes de enviar
          const estado = (typeof whatsapp.estadoWhatsApp === 'function') ? whatsapp.estadoWhatsApp() : null;
          if (!estado || !estado.connected) {
            resultados.whatsapp = 'no_conectado';
          } else {
            await whatsapp.enviarMensaje(miembro.celular, mensaje);
            resultados.whatsapp = 'enviado';
          }
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
