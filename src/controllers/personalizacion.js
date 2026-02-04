const modeloPersonalizacion = require('../models/personalizacion');

const guardarColores = async (req, res) => {
  try {
    const { colorPrimario, colorSecundario, colorAcento } = req.body;

    // Validar que sean colores en formato hex válidos
    const regexColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!regexColor.test(colorPrimario) || !regexColor.test(colorSecundario) || !regexColor.test(colorAcento)) {
      return res.status(400).json({ ok: false, error: 'Colores inválidos. Formato: #RRGGBB' });
    }

    await modeloPersonalizacion.guardarColores({
      colorPrimario,
      colorSecundario,
      colorAcento
    });

    res.json({ ok: true, mensaje: 'Colores guardados correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

const obtenerColores = async (req, res) => {
  try {
    const colores = await modeloPersonalizacion.obtenerColores();

    res.json({ 
      ok: true, 
      data: colores || {
        colorPrimario: '#003049',
        colorSecundario: '#023e8a',
        colorAcento: '#669bbc'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

module.exports = { guardarColores, obtenerColores };
