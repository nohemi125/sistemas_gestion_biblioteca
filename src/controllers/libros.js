const Libro = require('../models/libros');

const obtenerLibros = async (req, res) => {
  try {
    const libros = await Libro.obtenerTodos();
    res.json(libros);
  } catch (error) {
    console.error("Error al obtener libros:", error);
    res.status(500).json({ error: "Error al obtener los libros" });
  }
};

const obtenerLibroPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const libro = await Libro.obtenerPorId(id);

    if (!libro) {
      return res.status(404).json({ mensaje: "Libro no encontrado" });
    }

    res.json(libro);
  } catch (error) {
    console.error("Error al obtener libro:", error);
    res.status(500).json({ error: "Error al obtener el libro" });
  }
};


const crearLibro = async (req, res) => {
  try {
    const resultado = await Libro.crear(req.body);
    
    // Si se actualizó un libro existente
    if (resultado.mensaje) {
      return res.json({
        success: true,
        mensaje: `El libro ya existe. Se agregaron ${resultado.cantidadAgregada} unidades. Total: ${resultado.cantidadTotal}`,
        libro: resultado
      });
    }
    
    // Si se creó un libro nuevo
    res.json({
      success: true,
      mensaje: 'Libro creado correctamente',
      libro: resultado
    });
  } catch (error) {
    console.error("Error al crear libro:", error);
    res.status(500).json({ error: "Error al crear el libro" });
  }
};

const actualizarLibro = async (req, res) => {
  try {
    const { id } = req.params;
    await Libro.actualizar(id, req.body);
    res.json({ mensaje: "Libro actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar libro:", error);
    res.status(500).json({ error: "Error al actualizar el libro" });
  }
};

const eliminarLibro = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await Libro.eliminar(id);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Libro no encontrado' });
    }

    res.json({ mensaje: 'Libro eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar libro:', error);
    res.status(500).json({ error: 'Error al eliminar libro' });
  }
};

const buscarLibros = async (req, res) => {
  try {
    const termino = req.query.termino || req.query.titulo || req.query.q || '';
    const { categoria } = req.query;
    const libros = await Libro.buscar(termino, categoria);
    res.json(libros);
  } catch (error) {
    console.error("Error al buscar libros:", error);
    res.status(500).json({ error: "Error al buscar libros" });
  }
};





module.exports = {
  obtenerLibros,
  obtenerLibroPorId,
  crearLibro,
  actualizarLibro,
  eliminarLibro,
  buscarLibros
};
