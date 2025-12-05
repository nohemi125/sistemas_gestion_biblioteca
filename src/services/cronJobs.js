const multasService = require('./multasService');

function startMultasUpdater() {
  // Ejecutar al arrancar
  (async () => {
    try {
      await multasService.generarMultasDiarias();
      console.log('Generador de multas: ejecución inicial completada');
    } catch (err) {
      console.error('Error en generación inicial de multas:', err);
    }
  })();

  // Ejecutar cada 24 horas (86400000 ms)
  setInterval(async () => {
    try {
      await multasService.generarMultasDiarias();
      console.log('Generador de multas: ejecución diaria completada');
    } catch (err) {
      console.error('Error en generación diaria de multas:', err);
    }
  }, 24 * 60 * 60 * 1000);
}

module.exports = { startMultasUpdater };
