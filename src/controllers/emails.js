const Prestamo = require('../models/prestamos');
const Miembro = require('../models/miembros');
const { enviarCorreo, plantillaRecordatorio, plantillaMulta } = require('../utils/emailService');

/**
 * 📨 Enviar recordatorio de devolución
 */
const enviarRecordatorio = async (req, res) => {
	try {
		const { id_prestamo } = req.body;

		// Obtener información del préstamo
		const [prestamo] = await Prestamo.listarPorId(id_prestamo);

		if (!prestamo) {
			return res.status(404).json({ error: 'Préstamo no encontrado' });
		}

		if (prestamo.estado === 'Devuelto') {
			return res.status(400).json({ error: 'El préstamo ya fue devuelto' });
		}

		// Obtener correo del miembro
		const miembro = await Miembro.obtenerPorId(prestamo.id_miembro);

		if (!miembro || !miembro.email) {
			return res.status(400).json({ error: 'El miembro no tiene correo registrado' });
		}

		// Formatear fecha de devolución
		const fechaDevolucion = new Date(prestamo.fecha_devolucion).toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

		// Generar HTML del correo
		const htmlContent = plantillaRecordatorio({
			nombreMiembro: prestamo.nombre_miembro,
			tituloLibro: prestamo.titulo_libro,
			fechaDevolucion: fechaDevolucion,
			idPrestamo: id_prestamo,
		});

		// Enviar correo
		await enviarCorreo({
			destinatario: miembro.email,
			asunto: '📚 Recordatorio de Devolución de Libro',
			mensaje: `Hola ${prestamo.nombre_miembro},\n\nTe recordamos que tienes pendiente la devolución del libro "${prestamo.titulo_libro}" para la fecha ${fechaDevolucion}.\n\nGracias por utilizar nuestros servicios.`,
			html: htmlContent,
		});

		res.json({
			mensaje: 'Recordatorio enviado correctamente',
			destinatario: miembro.email,
		});
	} catch (error) {
		console.error('Error al enviar recordatorio:', error);
		res.status(500).json({ error: 'Error al enviar el recordatorio' });
	}
};

/**
 * 💰 Enviar notificación de multa
 */
const enviarMulta = async (req, res) => {
	try {
		const { id_prestamo, monto_multa } = req.body;

		if (!monto_multa || monto_multa <= 0) {
			return res.status(400).json({ error: 'El monto de la multa es requerido y debe ser mayor a 0' });
		}

		// Obtener información del préstamo
		const [prestamo] = await Prestamo.listarPorId(id_prestamo);

		if (!prestamo) {
			return res.status(404).json({ error: 'Préstamo no encontrado' });
		}

		if (prestamo.estado === 'Devuelto') {
			return res.status(400).json({ error: 'El préstamo ya fue devuelto' });
		}

		// Obtener correo del miembro
		const miembro = await Miembro.obtenerPorId(prestamo.id_miembro);

		if (!miembro || !miembro.email) {
			return res.status(400).json({ error: 'El miembro no tiene correo registrado' });
		}

		// Calcular días de retraso
		const fechaDevolucion = new Date(prestamo.fecha_devolucion);
		const fechaActual = new Date();
		const diasRetraso = Math.ceil((fechaActual - fechaDevolucion) / (1000 * 60 * 60 * 24));

		if (diasRetraso <= 0) {
			return res.status(400).json({ error: 'El préstamo no tiene días de retraso' });
		}

		// Generar HTML del correo
		const htmlContent = plantillaMulta({
			nombreMiembro: prestamo.nombre_miembro,
			tituloLibro: prestamo.titulo_libro,
			diasRetraso: diasRetraso,
			montoMulta: parseFloat(monto_multa),
			idPrestamo: id_prestamo,
		});

		// Enviar correo
		await enviarCorreo({
			destinatario: miembro.email,
			asunto: '⚠️ Aviso de Multa por Retraso - Biblioteca',
			mensaje: `Estimado/a ${prestamo.nombre_miembro},\n\nTe informamos que tienes ${diasRetraso} días de retraso en la devolución del libro "${prestamo.titulo_libro}".\n\nSe ha generado una multa de $${parseFloat(monto_multa).toFixed(2)}.\n\nPor favor, acércate a la biblioteca lo antes posible.`,
			html: htmlContent,
		});

		res.json({
			mensaje: 'Notificación de multa enviada correctamente',
			destinatario: miembro.email,
			monto: parseFloat(monto_multa),
			dias_retraso: diasRetraso,
		});
	} catch (error) {
		console.error('Error al enviar notificación de multa:', error);
		res.status(500).json({ error: 'Error al enviar la notificación de multa' });
	}
};

module.exports = {
	enviarRecordatorio,
	enviarMulta,
};
