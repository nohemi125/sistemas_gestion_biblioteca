class PersonalizacionColores {
  constructor() {
    this.form = document.getElementById('formPersonalizacion');
    this.inputs = {
      colorPrimario: document.getElementById('colorPrimario'),
      colorSecundario: document.getElementById('colorSecundario'),
      colorAcento: document.getElementById('colorAcento')
    };

    if (this.validarElementos()) {
      this.inicializarEventos();
      this.cargarColoresGuardados();
    }
  }

  validarElementos() {
    return this.form && 
           this.inputs.colorPrimario && 
           this.inputs.colorSecundario && 
           this.inputs.colorAcento;
  }

  inicializarEventos() {
    // Evento de submit del formulario
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.guardarColores();
    });

    // Actualizar los inputs de texto readonly cuando cambia el color
    Object.keys(this.inputs).forEach(key => {
      const colorInput = this.inputs[key];
      const textInput = colorInput.parentElement.querySelector('input[type="text"]');
      
      if (textInput) {
        colorInput.addEventListener('input', (e) => {
          textInput.value = e.target.value;
          this.actualizarColor(key, e.target.value);
        });
      }
    });
  }

  actualizarColor(tipo, valor) {

    // Actualizar CSS custom property (convertir a formato compatible)
    const nombreVar = this.convertirNombre(tipo);
    document.documentElement.style.setProperty(nombreVar, valor);

    // Actualizar preview
    this.actualizarPreview(tipo, valor);

    // Marcar como modificado
    document.body.classList.add('tema-personalizado');
  }

  convertirNombre(tipo) {
    const mapa = {
      colorPrimario: '--color-primario',
      colorSecundario: '--color-secundario',
      colorAcento: '--color-acento'
    };
    return mapa[tipo];
  }

  actualizarPreview(tipo, valor) {
    const previewMap = {
      colorPrimario: 'previewPrimario',
      colorSecundario: 'previewSecundario',
      colorAcento: 'previewAcento'
    };
    
    const previewId = previewMap[tipo];
    const previewBtn = document.getElementById(previewId);
    if (previewBtn) {
      previewBtn.style.backgroundColor = valor;
    }
  }

  async guardarColores() {
    const colores = {
      colorPrimario: this.inputs.colorPrimario.value,
      colorSecundario: this.inputs.colorSecundario.value,
      colorAcento: this.inputs.colorAcento.value
    };

    const mensajeEl = document.getElementById('mensajePersonalizacion');

    try {
      const response = await fetch('/api/personalizacion/colores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colores)
      });

      const resultado = await response.json();

      if (resultado.ok) {
        // Mostrar mensaje de éxito inline
        if (mensajeEl) {
          mensajeEl.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show">
              <i class="bi bi-check-circle me-2"></i>
              <strong>Éxito:</strong> Colores guardados correctamente
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
          setTimeout(() => { mensajeEl.innerHTML = ''; }, 5000);
        }
        localStorage.setItem('colores_personalizados', JSON.stringify(colores));
      } else {
        // Mostrar mensaje de error inline
        if (mensajeEl) {
          mensajeEl.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show">
              <i class="bi bi-exclamation-circle me-2"></i>
              <strong>Error:</strong> ${resultado.error || 'No se pudieron guardar los colores'}
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
        }
      }
    } catch (err) {
      console.error('Error completo:', err);
      if (mensajeEl) {
        mensajeEl.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show">
            <i class="bi bi-exclamation-circle me-2"></i>
            <strong>Error:</strong> Error al guardar colores
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>`;
      }
    }
  }

  async cargarColoresGuardados() {
    try {
      const response = await fetch('/api/personalizacion/colores');
      const resultado = await response.json();

      if (resultado.ok && resultado.data) {
        const colores = resultado.data;
        
        // Actualizar inputs de color
        this.inputs.colorPrimario.value = colores.colorPrimario || '#003049';
        this.inputs.colorSecundario.value = colores.colorSecundario || '#023e8a';
        this.inputs.colorAcento.value = colores.colorAcento || '#669bbc';

        // Actualizar inputs de texto readonly
        Object.keys(this.inputs).forEach(key => {
          const colorInput = this.inputs[key];
          const textInput = colorInput.parentElement.querySelector('input[type="text"]');
          if (textInput) {
            textInput.value = colorInput.value;
          }
        });

        // Aplicar colores al cargar
        this.actualizarColor('colorPrimario', this.inputs.colorPrimario.value);
        this.actualizarColor('colorSecundario', this.inputs.colorSecundario.value);
        this.actualizarColor('colorAcento', this.inputs.colorAcento.value);
      }
    } catch (err) {
      console.error('Usando colores predeterminados:', err);
    }
  }
}

// Función global para resetear colores (llamada desde el botón onclick en HTML)
function resetearColores() {
  if (confirm('¿Restaurar colores predeterminados?')) {
    const inputs = {
      colorPrimario: document.getElementById('colorPrimario'),
      colorSecundario: document.getElementById('colorSecundario'),
      colorAcento: document.getElementById('colorAcento')
    };

    const mensajeEl = document.getElementById('mensajePersonalizacion');

    // Valores predeterminados
    inputs.colorPrimario.value = '#003049';
    inputs.colorSecundario.value = '#023e8a';
    inputs.colorAcento.value = '#669bbc';

    // Actualizar los inputs de texto también
    Object.values(inputs).forEach(input => {
      const textInput = input.parentElement.querySelector('input[type="text"]');
      if (textInput) {
        textInput.value = input.value;
      }
    });

    // Aplicar y guardar
    document.documentElement.style.setProperty('--color-primario', '#003049');
    document.documentElement.style.setProperty('--color-secundario', '#023e8a');
    document.documentElement.style.setProperty('--color-acento', '#669bbc');

    // Guardar en BD
    fetch('/api/personalizacion/colores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        colorPrimario: '#003049',
        colorSecundario: '#023e8a',
        colorAcento: '#669bbc'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok && mensajeEl) {
        mensajeEl.innerHTML = `
          <div class="alert alert-info alert-dismissible fade show">
            <i class="bi bi-check-circle me-2"></i>
            <strong>Éxito:</strong> Colores restablecidos a valores predeterminados
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>`;
        setTimeout(() => { mensajeEl.innerHTML = ''; }, 5000);
      }
    })
    .catch(err => {
      console.error(err);
      if (mensajeEl) {
        mensajeEl.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show">
            <i class="bi bi-exclamation-circle me-2"></i>
            <strong>Error:</strong> Error al restablecer colores
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>`;
      }
    });
  }
}

// Inicializar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new PersonalizacionColores();
});
