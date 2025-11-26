const Prestamo = require('../models/prestamos');
const Miembro = require('../models/miembros');
const notifications = require('../services/notifications');

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

		// Determinar canales solicitados
		const { via = 'both', canales } = req.body;
		let viaNorm = (via || '').toString().toLowerCase();
		if (!viaNorm) {
			if (canales && typeof canales === 'object') {
				const { email, whatsapp } = canales;
				if (email && !whatsapp) viaNorm = 'email';
				else if (!email && whatsapp) viaNorm = 'whatsapp';
				else viaNorm = 'both';
			} else {
				viaNorm = 'both';
			}
		}

		if (!miembro) {
			return res.status(400).json({ error: 'El miembro no está registrado' });
		}

		if ((viaNorm === 'both' || viaNorm === 'email') && !miembro.email) {
			return res.status(400).json({ error: 'El miembro no tiene correo registrado' });
		}

		// Formatear fecha de devolución
		const fechaDevolucion = new Date(prestamo.fecha_devolucion).toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

		// Delegar envío (según opción 'via')
		const mensaje = req.body.mensaje || req.body.mensage || null;
		await notifications.enviarRecordatorio(prestamo, miembro, { via: viaNorm, canales, mensaje });
		res.json({
			mensaje: 'Recordatorio procesado',
			destinatario: miembro.email,
			solicitado: viaNorm || canales,
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

		const { via = 'both', canales } = req.body;
		let viaNorm = (via || '').toString().toLowerCase();
		if (!viaNorm) {
			if (canales && typeof canales === 'object') {
				const { email, whatsapp } = canales;
				if (email && !whatsapp) viaNorm = 'email';
				else if (!email && whatsapp) viaNorm = 'whatsapp';
				else viaNorm = 'both';
			} else {
				viaNorm = 'both';
			}
		}

		if (!miembro) {
			return res.status(400).json({ error: 'El miembro no está registrado' });
		}

		if ((viaNorm === 'both' || viaNorm === 'email') && !miembro.email) {
			return res.status(400).json({ error: 'El miembro no tiene correo registrado' });
		}

		// Calcular días de retraso
		const fechaDevolucion = new Date(prestamo.fecha_devolucion);
		const fechaActual = new Date();
		const diasRetraso = Math.ceil((fechaActual - fechaDevolucion) / (1000 * 60 * 60 * 24));

		if (diasRetraso <= 0) {
			return res.status(400).json({ error: 'El préstamo no tiene días de retraso' });
		}

		// Delegar envío (según opción 'via')
		const mensaje = req.body.mensaje || req.body.mensage || null;
		await notifications.enviarMulta(prestamo, miembro, monto_multa, { via: viaNorm, canales, mensaje });
		res.json({
			mensaje: 'Notificación de multa procesada',
			destinatario: miembro.email,
			monto: parseFloat(monto_multa),
			dias_retraso: diasRetraso,
			solicitado: viaNorm || canales,
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
