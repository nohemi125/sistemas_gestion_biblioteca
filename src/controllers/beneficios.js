const Beneficios = require('../models/beneficios');
const Miembro = require('../models/miembros');
const emailService = require('../utils/emailService');
const whatsapp = require('../services/whatsapp');

// Obtener todos los beneficios
exports.obtenerBeneficios = async (req, res) => {
  try {
    const lista = await Beneficios.obtenerBeneficios();
    res.json({ ok: true, beneficios: lista });
  } catch (error) {
    console.error("Error obteniendo beneficios:", error);
    res.status(500).json({ ok: false, mensaje: "Error obteniendo beneficios" });
  }
};

// Obtener un beneficio por ID
exports.obtenerBeneficioPorId = async (req, res) => {
  try {
    const id = req.params.id;
    const beneficio = await Beneficios.obtenerBeneficioPorId(id);

    if (!beneficio) {
      return res.status(404).json({ ok: false, mensaje: "Beneficio no encontrado" });
    }

    res.json({ ok: true, beneficio });
  } catch (error) {
    console.error("Error obteniendo beneficio:", error);
    res.status(500).json({ ok: false, mensaje: "Error obteniendo beneficio" });
  }
};

// Crear beneficio
exports.crearBeneficio = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ ok: false, mensaje: "El nombre es obligatorio" });
    }

    const nuevo = await Beneficios.crearBeneficio({ nombre, descripcion });
    res.json({ ok: true, beneficio: nuevo });
  } catch (error) {
    console.error("Error creando beneficio:", error);
    res.status(500).json({ ok: false, mensaje: "Error creando beneficio" });
  }
};

// Actualizar beneficio
exports.actualizarBeneficio = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, descripcion } = req.body;

    const existe = await Beneficios.obtenerBeneficioPorId(id);
    if (!existe) {
      return res.status(404).json({ ok: false, mensaje: "Beneficio no encontrado" });
    }

    const actualizado = await Beneficios.actualizarBeneficio(id, { nombre, descripcion });
    res.json({ ok: true, beneficio: actualizado });
  } catch (error) {
    console.error("Error actualizando beneficio:", error);
    res.status(500).json({ ok: false, mensaje: "Error actualizando beneficio" });
  }
};

// Eliminar beneficio
exports.eliminarBeneficio = async (req, res) => {
  try {
    const id = req.params.id;

    const existe = await Beneficios.obtenerBeneficioPorId(id);
    if (!existe) {
      return res.status(404).json({ ok: false, mensaje: "Beneficio no encontrado" });
    }

    await Beneficios.eliminarBeneficio(id);
    res.json({ ok: true, mensaje: "Beneficio eliminado" });
  } catch (error) {
    console.error("Error eliminando beneficio:", error);
    res.status(500).json({ ok: false, mensaje: "Error eliminando beneficio" });
  }
};

// Obtener miembros elegibles para beneficios
exports.obtenerMiembrosParaBeneficios = async (req, res) => {
  try {
    const min = parseInt(req.query.min) || 0;
    const dias = parseInt(req.query.dias) || 30;
    const minDays = parseInt(req.query.minDays) || 0;

    // Consultar préstamos en el periodo solicitado y con duración mínima
    const db = require('../config/db');
    const sql = `
      SELECT m.id_miembro, m.nombres, m.apellidos, m.email,
             COUNT(p.id_prestamo) AS prestamos_count
      FROM prestamos p
      INNER JOIN miembros m ON m.id_miembro = p.id_miembro
      WHERE p.fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND DATEDIFF(IFNULL(p.fecha_devolucion, CURDATE()), p.fecha_prestamo) >= ?
      GROUP BY m.id_miembro
      HAVING prestamos_count >= ?
      ORDER BY prestamos_count DESC
    `;

    const [rows] = await db.query(sql, [dias, minDays, min]);
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo miembros para beneficios:', error);
    res.status(500).json({ ok: false, mensaje: 'Error obteniendo miembros' });
  }
};

// Asignar beneficio y enviar notificación (email / whatsapp)
exports.asignarBeneficio = async (req, res) => {
  try {
    const { id_miembro, tipo, mensaje, canales, via } = req.body;
    console.log('[beneficios.asignarBeneficio] request body:', { id_miembro, tipo, hasMensaje: !!mensaje, canales, via });

    if (!id_miembro || !tipo) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan id_miembro o tipo' });
    }

    const miembro = await Miembro.obtenerPorId(id_miembro);
    if (!miembro) return res.status(404).json({ ok: false, mensaje: 'Miembro no encontrado' });

    const beneficio = await Beneficios.obtenerBeneficioPorId(tipo);
    if (!beneficio) return res.status(404).json({ ok: false, mensaje: 'Beneficio no encontrado' });

    // Construir cuerpo del mensaje
    const titulo = beneficio.nombre || '';
    const descripcion = beneficio.descripcion || '';
    const texto = mensaje && mensaje.trim() !== '' ? mensaje : `🎉¡Felicidades ${miembro.nombres || ''} ${miembro.apellidos || ''}!\n\nHas sido seleccionado/a para recibir un beneficio especial por tu participación.\n\n*${titulo}*\n${descripcion}\n\n¡Gracias por ser parte de nuestra comunidad!`;

    const resultados = { email: 'no_solicitado', whatsapp: 'no_solicitado' };

    // Determinar canales solicitados desde frontend (si vienen)
    const canalesReq = (canales && typeof canales === 'object') ? canales : null
    const viaReq = (via || '').toString().toLowerCase()

    // Funcion auxiliar para decidir si se debe intentar un canal
    const debeIntentar = (canal) => {
      if (viaReq) return (viaReq === 'both' || viaReq === canal)
      if (canalesReq) return !!canalesReq[canal]
      return true // por defecto intentar todos los canales disponibles
    }

    // Intentar enviar email si el miembro tiene email y se solicita
    if (miembro.email && debeIntentar('email')) {
      try {
        console.log('[beneficios.asignarBeneficio] intentando enviar email a', miembro.email)
        await emailService.enviarCorreo({
          destinatario: miembro.email,
          asunto: `🎁 Has recibido un beneficio: ${titulo}`,
          mensaje: texto,
          html: `<p>${String(texto).replace(/\n/g, '<br>')}</p>`
        });
        resultados.email = 'enviado';
        console.log('[beneficios.asignarBeneficio] email enviado a', miembro.email)
      } catch (err) {
        console.error('Error enviando email de beneficio:', err);
        resultados.email = 'error';
      }
    }

    // Intentar enviar WhatsApp si el miembro tiene celular y se solicita
    if (miembro.celular && debeIntentar('whatsapp')) {
      try {
        console.log('[beneficios.asignarBeneficio] intentando enviar WhatsApp a', miembro.celular)
        await whatsapp.enviarMensaje(miembro.celular, texto);
        resultados.whatsapp = 'enviado';
        console.log('[beneficios.asignarBeneficio] whatsapp enviado a', miembro.celular)
      } catch (err) {
        console.error('Error enviando WhatsApp de beneficio:', err);
        resultados.whatsapp = err && err.code === 'WHATSAPP_NOT_READY' ? 'no_conectado' : 'error';
      }
    }

    // Si no se intentó ninguno (no hay canales disponibles o permisos), devolver error
    if (resultados.email === 'no_solicitado' && resultados.whatsapp === 'no_solicitado') {
      return res.status(400).json({ ok: false, mensaje: 'El miembro no tiene email ni celular registrados o no se solicitó ningún canal' });
    }

    // TODO: opcionalmente registrar la asignación en BD (tabla beneficios_asignados)

    return res.json({ ok: true, mensaje: 'Notificación procesada', resultados, destinatario: miembro.email || miembro.celular });
  } catch (error) {
    console.error('Error en asignarBeneficio:', error);
    res.status(500).json({ ok: false, mensaje: 'Error asignando beneficio' });
  }
};
