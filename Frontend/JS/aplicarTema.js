/**
 * Script para aplicar tema personalizado al cargar la página
 * Se ejecuta lo antes posible para evitar parpadeos
 */

async function aplicarTemaPersistido() {
  try {
    const response = await fetch('/api/personalizacion/colores');
    const resultado = await response.json();

    if (resultado.ok && resultado.data) {
      const colores = resultado.data;
      
      // Aplicar variables CSS personalizadas
      document.documentElement.style.setProperty('--color-primario', colores.colorPrimario);
      document.documentElement.style.setProperty('--color-secundario', colores.colorSecundario);
      document.documentElement.style.setProperty('--color-acento', colores.colorAcento);
      
      // También actualizar aliases para compatibilidad
      document.documentElement.style.setProperty('--colorPrimario', colores.colorPrimario);
      document.documentElement.style.setProperty('--colorSecundario', colores.colorSecundario);
      document.documentElement.style.setProperty('--colorAcento', colores.colorAcento);
      
      // Marcar que hay tema personalizado
      document.body.classList.add('tema-personalizado');
    }
  } catch (err) {
    console.log('Usando colores predeterminados');
  }
}

// Ejecutar inmediatamente
aplicarTemaPersistido();
