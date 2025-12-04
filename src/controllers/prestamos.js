const Prestamo = require('../models/prestamos');
const Miembro = require('../models/miembros');
const Libro = require('../models/libros');

//  Obtener todos los préstamos (con nombres de miembro y título de libro)
const obtenerPrestamos = async (req, res) => {
	try {
		const prestamos = await Prestamo.listar();
		res.json(prestamos);
	} catch (error) {
		console.error('Error al obtener préstamos:', error);
		res.status(500).json({ error: 'Error al obtener los préstamos' });
	}
};

//  Buscar préstamos por filtro (miembro, libro o ID)
const buscarPrestamos = async (req, res) => {
	try {
		const { filtro } = req.query;
		const prestamos = await Prestamo.buscar(filtro || '');
		res.json(prestamos);
	} catch (error) {
		console.error('Error al buscar préstamos:', error);
		res.status(500).json({ error: 'Error al buscar préstamos' });
	}
};

//  Obtener un préstamo por ID
const obtenerPrestamoPorId = async (req, res) => {
	try {
		const { id } = req.params;
		const [prestamo] = await Prestamo.listarPorId(id);
		if (!prestamo) {
			return res.status(404).json({ error: 'Préstamo no encontrado' });
		}
		res.json(prestamo);
	} catch (error) {
		console.error('Error al obtener préstamo:', error);
		res.status(500).json({ error: 'Error al obtener el préstamo' });
	}
};

//  Crear un nuevo préstamo
const crearPrestamo = async (req, res) => {
	try {
		const { id_miembro, id_libro, fecha_prestamo, fecha_devolucion, estado } = req.body;

		if (!id_miembro || !id_libro || !fecha_prestamo || !fecha_devolucion) {
			return res.status(400).json({
				error: 'id_miembro, id_libro, fecha_prestamo y fecha_devolucion son requeridos',
			});
		}

		// Verificar que el miembro existe y está activo
		const miembro = await Miembro.obtenerPorId(id_miembro);
		if (!miembro) {
			return res.status(404).json({ error: 'Miembro no encontrado' });
		}
		// miembro.activo puede ser 0/1 o undefined (por compatibilidad)
		const activoVal = (miembro.activo === undefined || miembro.activo === null) ? 1 : Number(miembro.activo);
		if (activoVal === 0) {
			return res.status(400).json({ error: 'Miembro inactivo' });
		}

		let nuevo;
		try {
			nuevo = await Prestamo.crear({
				id_miembro,
				id_libro,
				fecha_prestamo,
				fecha_devolucion,
				estado: estado || 'Activo',
			});
		} catch (err) {
			// Errores esperados del modelo
			if (err && err.code === 'OUT_OF_STOCK') {
				return res.status(400).json({ error: 'Libro agotado' });
			}
			if (err && err.code === 'BOOK_NOT_FOUND') {
				return res.status(404).json({ error: 'Libro no encontrado' });
			}
			// Re-throw para ser capturado por el catch externo
			throw err;
		}

		// Devuelve el registro ya enriquecido para la tabla si es posible
		try {
			const [enriquecido] = await Prestamo.listarPorId(nuevo.id_prestamo);
			if (enriquecido) return res.status(201).json(enriquecido);
		} catch (_) {
			// si falla la consulta enriquecida, devolvemos el básico
		}

		res.status(201).json(nuevo);
	} catch (error) {
		console.error('Error al crear préstamo:', error);
		res.status(500).json({ error: 'Error al crear el préstamo' });
	}
};

//  Actualizar un préstamo
const actualizarPrestamo = async (req, res) => {
	try {
		const { id } = req.params;
		const datos = req.body || {};

		// Si se registra la devolución, actualizar préstamo y aumentar stock del libro
		if (datos.estado === 'Devuelto') {
			const filas = await Prestamo.listarPorId(id);
			const prestamo = filas && filas.length > 0 ? filas[0] : null;
			if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });

			await Prestamo.actualizar(id, datos);

			try {
				await Libro.incrementarCantidad(prestamo.id_libro, 1);
			} catch (err) {
				console.error('Error al actualizar stock del libro tras devolución:', err);
			}

			return res.json({ mensaje: 'Préstamo (devolución) registrado correctamente' });
		}

		await Prestamo.actualizar(id, req.body);
		res.json({ mensaje: 'Préstamo actualizado correctamente' });
	} catch (error) {
		console.error('Error al actualizar préstamo:', error);
		res.status(500).json({ error: 'Error al actualizar el préstamo' });
	}
};

//  Eliminar un préstamo
const eliminarPrestamo = async (req, res) => {
	try {
		const { id } = req.params;
		const resultado = await Prestamo.eliminar(id);
		if (resultado.affectedRows === 0) {
			return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
		}
		res.json({ mensaje: 'Préstamo eliminado correctamente' });
	} catch (error) {
		console.error('Error al eliminar préstamo:', error);
		res.status(500).json({ error: 'Error al eliminar el préstamo' });
	}
};

module.exports = {
	obtenerPrestamos,
	buscarPrestamos,
	obtenerPrestamoPorId,
	crearPrestamo,
	actualizarPrestamo,
	eliminarPrestamo,
};
