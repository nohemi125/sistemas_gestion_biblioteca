const Miembro = require('../models/miembros');

// ✅ Obtener todos los miembros
const obtenerMiembros = async (req, res) => {
  try {
    const miembros = await Miembro.obtenerTodos();
    res.json(miembros);
  } catch (error) {
    console.error("Error al obtener miembros:", error);
    res.status(500).json({ error: "Error al obtener los miembros" });
  }
};

// ✅ Obtener miembro por ID
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

// ✅ Crear miembro
const crearMiembro = async (req, res) => {
  try {
    const nuevoMiembro = await Miembro.crear(req.body);
    res.json(nuevoMiembro);
  } catch (error) {
    console.error("Error al crear miembro:", error);
    res.status(500).json({ error: "Error al crear el miembro" });
  }
};

// ✅ Actualizar miembro
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
    res.status(500).json({ error: 'Error al eliminar el miembro' });
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



module.exports = {
  obtenerMiembros,
  obtenerMiembroPorId,
  crearMiembro,
  actualizarMiembro,
  eliminarMiembro,
  buscarMiembros
};
