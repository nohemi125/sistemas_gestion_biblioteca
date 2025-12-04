
// Función reutilizable para mostrar mensajes en modal
function showModalMessage(title, message, type = 'primary') {
  const modalEl = document.getElementById('modalMensaje');
  const header = document.getElementById('modalMensajeHeader');
  const titleEl = document.getElementById('modalMensajeTitulo');
  const bodyEl = document.getElementById('modalMensajeBody');

  if (!modalEl) {
    // Si el modal no existe, caer de vuelta a alert
    alert(title + " - " + message);
    return;
  }

  header.classList.remove('bg-success', 'bg-danger', 'bg-primary', 'text-white');
  if (type === 'success') header.classList.add('bg-success', 'text-white');
  else if (type === 'danger') header.classList.add('bg-danger', 'text-white');
  else header.classList.add('bg-primary', 'text-white');

  if (titleEl) titleEl.textContent = title || '';
  if (bodyEl) bodyEl.textContent = message || '';

  const bsModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
  bsModal.show();
}


// MAPA
// =========================

// Crear el mapa en el contenedor
let map = L.map("mapContainer").setView([4.5709, -74.2973], 6); // Colombia por defecto

// Capa base del mapa (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Marcador dinámico
let marker = null;

// Geocoding helper: busca una dirección y coloca el marcador fijo
async function geocodeAddress(direccion) {
  direccion = (direccion || '').trim();
  if (!direccion) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    // Mover mapa y fijar marcador (no draggable)
    map.setView([lat, lon], 17);
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon]).addTo(map);
    }

    // Guardar lat/lng en los inputs ocultos del formulario
    const latInput = document.getElementById('latInstitucion');
    const lngInput = document.getElementById('lngInstitucion');
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lon;

    return { lat, lon };
  } catch (err) {
    console.error('Error buscando la dirección:', err);
    return null;
  }
}

// Ejecutar geocoding cuando el usuario presiona Enter en el campo o cuando el campo cambia
const direccionEl = document.getElementById('direccionInstitucion');
if (direccionEl) {
  direccionEl.addEventListener('keydown', async (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      await geocodeAddress(direccionEl.value);
    }
  });
  direccionEl.addEventListener('change', async () => {
    await geocodeAddress(direccionEl.value);
  });
}



// Mostrar vista previa inmediata al seleccionar logo
const inputLogoEl = document.getElementById('inputLogo');
if (inputLogoEl) {
  inputLogoEl.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target.result;
      const lp = document.getElementById('logoPreview');
      const lps = document.getElementById('logoPreviewSmall');
      if (lp) lp.src = src;
      if (lps) lps.src = src;
    };
    reader.readAsDataURL(file);
  });
}



// CAMBIOS DE DATOS DE INSTITUCIÓN
document.getElementById("formInstitucion").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("nombre", document.getElementById("nombreInstitucion").value);
  formData.append("telefono", document.getElementById("telefonoInstitucion").value);
  formData.append("direccion", document.getElementById("direccionInstitucion").value);

  const logo = document.getElementById("inputLogo").files[0];
  if (logo) {
    formData.append("logo", logo);
  }
  // adjuntar lat/lng si existen en los inputs ocultos
  const latHidden = document.getElementById('latInstitucion');
  const lngHidden = document.getElementById('lngInstitucion');
  if (latHidden && latHidden.value) formData.append('lat', latHidden.value);
  if (lngHidden && lngHidden.value) formData.append('lng', lngHidden.value);

  const res = await fetch("/api/perfil/institucion", {
    method: "POST",
      body: formData,
      credentials: 'include'
  });

  const data = await res.json();
  console.log("Respuesta del servidor:", data);
  // Mostrar resultado en modal en lugar de alert (usa la función global `showModalMessage`)

  if (res.ok) {
    // backend devuelve 
    const saved = data.data || null;
    if (saved) {
      // actualizar vista previa con los datos guardados
      document.getElementById("previewNombreInstitucion").textContent = saved.nombre || document.getElementById("previewNombreInstitucion").textContent;
      document.getElementById("previewNombrePlataforma").textContent = saved.plataforma || document.getElementById("previewNombrePlataforma").textContent;
      document.getElementById("previewEslogan").textContent = saved.eslogan || document.getElementById("previewEslogan").textContent;
      // teléfono y dirección
      const telEl = document.getElementById('previewTelefono');
      const dirEl = document.getElementById('previewDireccion');
      if (telEl) telEl.querySelector('span').textContent = saved.telefono || document.getElementById('telefonoInstitucion').value || 'Teléfono no definido';
      if (dirEl) dirEl.querySelector('span').textContent = saved.direccion || document.getElementById('direccionInstitucion').value || 'Dirección no definida';

      if (saved.logo) {
        let logoPath;
        if (saved.logo.startsWith('/')) {
          logoPath = '/uploads' + saved.logo;
        } else {
          logoPath = `/uploads/logos/${saved.logo}`;
        }
        const lp = document.getElementById('logoPreview');
        const lps = document.getElementById('logoPreviewSmall');
        if (lp) lp.src = logoPath;
        if (lps) lps.src = logoPath;
      }
    }

    showModalMessage('Éxito', data.mensaje || 'Guardado correctamente', 'success');
  } else {
    showModalMessage('Error', (data && data.mensaje) || 'Error guardando', 'danger');
  }
});



// ==== CARGA LA VISTA PREVIA DE DATOS GUARDADOS
async function cargarVistaPrevia() {
  try {
    const res = await fetch("/api/perfil/institucion");
    const resp = await res.json();
    // Backend responde { data: institucion } o { mensaje: 'Sin datos aún', data: null }
    const row = resp && resp.data ? resp.data : null;
    if (!row) return;

    // Llenar textos (model usa campos: nombre, telefono, direccion, logo)
    document.getElementById("previewNombreInstitucion").textContent = row.nombre || "Sin nombre";
    // Si tienes un campo plataforma en la BD, ajusta aquí. Usamos nombre como fallback
    document.getElementById("previewNombrePlataforma").textContent = row.plataforma || row.nombre || "Sin nombre";
    document.getElementById("previewEslogan").textContent = row.eslogan || "";

    // Rellenar también los campos del formulario para que persistan hasta que se cambien
    const nombreInput = document.getElementById('nombreInstitucion');
    const telefonoInput = document.getElementById('telefonoInstitucion');
    const direccionInput = document.getElementById('direccionInstitucion');
    if (nombreInput) nombreInput.value = row.nombre || '';
    if (telefonoInput) telefonoInput.value = row.telefono || '';
    if (direccionInput) direccionInput.value = row.direccion || '';

    // Logo (se sirve en /uploads/logos/filename)
    if (row.logo) {
      // row.logo puede ser el nombre del archivo ('logo.png') o una ruta ('/logos/logo.png')
      let logoUrl;
      if (row.logo.startsWith('/')) {
        // si se almacena como '/logos/filename'
        logoUrl = '/uploads' + row.logo;
      } else {
        logoUrl = `/uploads/logos/${row.logo}`;
      }
      const lps = document.getElementById("logoPreviewSmall");
      const lp = document.getElementById("logoPreview");
      if (lp) lp.src = logoUrl;
      if (lps) lps.src = logoUrl;
    }
    // Si la respuesta incluye coordenadas, fijarlas en el mapa y en los inputs ocultos
    const latCandidates = ['lat', 'latitude', 'latitud'];
    const lngCandidates = ['lng', 'lon', 'longitude', 'longitud'];
    let latVal = null;
    let lngVal = null;
    for (const key of latCandidates) if (row[key] != null) { latVal = parseFloat(row[key]); break; }
    for (const key of lngCandidates) if (row[key] != null) { lngVal = parseFloat(row[key]); break; }
    // Evitar pasar null/undefined a Leaflet: usar Number.isFinite tras parseFloat
    if (Number.isFinite(latVal) && Number.isFinite(lngVal)) {
      const latInput = document.getElementById('latInstitucion');
      const lngInput = document.getElementById('lngInstitucion');
      if (latInput) latInput.value = latVal;
      if (lngInput) lngInput.value = lngVal;
      // colocar marcador fijo
      try {
        map.setView([latVal, lngVal], 17);
        if (marker) marker.setLatLng([latVal, lngVal]); else marker = L.marker([latVal, lngVal]).addTo(map);
      } catch (mapErr) {
        console.warn('No se pudo fijar la vista del mapa con las coordenadas:', latVal, lngVal, mapErr);
      }
    }
      // teléfono y dirección
      const telEl = document.getElementById('previewTelefono');
      const dirEl = document.getElementById('previewDireccion');
      if (telEl) telEl.querySelector('span').textContent = row.telefono || 'Teléfono no definido';
      if (dirEl) dirEl.querySelector('span').textContent = row.direccion || 'Dirección no definida';

  } catch (error) {
    console.log("Error cargando vista previa:", error);
  }
}

// Además cargar la personalización guardada (nombrePlataforma, eslogan, colores)
async function cargarPersonalizacionEnPreview() {
  try {
    const res = await fetch('/api/perfil/personalizacion');
    const json = await res.json();
    // Si el endpoint devuelve { ok: true, data: {...} }
    const data = (json && json.ok && json.data) ? json.data : (json && json.data) ? json.data : json;
    if (!data) return;

    if (data.nombrePlataforma) {
      const el = document.getElementById('previewNombrePlataforma');
      if (el) el.textContent = data.nombrePlataforma;
      // No sobreescribir el título principal de la vista previa (nombre de la institución)
      // Solo actualizar el input del formulario
      const nombreInput = document.getElementById('nombrePlataforma');
      if (nombreInput) nombreInput.value = data.nombrePlataforma;
    }
    if (data.eslogan) {
      const el = document.getElementById('previewEslogan');
      if (el) el.textContent = data.eslogan;
      const esloganInput = document.getElementById('eslogan');
      if (esloganInput) esloganInput.value = data.eslogan;
    }

    // Colores
    try {
      const badges = document.querySelectorAll('.preview-badge');
      if (data.colorPrimario && badges[0]) badges[0].style.backgroundColor = data.colorPrimario;
      if (data.colorSecundario && badges[1]) badges[1].style.backgroundColor = data.colorSecundario;
      if (data.colorAcento && badges[2]) badges[2].style.backgroundColor = data.colorAcento;
      // También actualizar inputs si existen
      if (data.colorPrimario && document.getElementById('colorPrimario')) document.getElementById('colorPrimario').value = data.colorPrimario;
      if (data.colorSecundario && document.getElementById('colorSecundario')) document.getElementById('colorSecundario').value = data.colorSecundario;
      if (data.colorAcento && document.getElementById('colorAcento')) document.getElementById('colorAcento').value = data.colorAcento;
    } catch (e) {}

  } catch (err) {
    console.warn('No se pudo cargar personalización para preview:', err);
  }
}



// CAMBIAR CORREO PARA INICIAR SESIÓN EN EL SISTEMA
// Inicialización de estado del formulario de usuario. Se cargará desde el servidor.
window._perfil_initial = { nombre: '', correo: '' };

// Cargar datos del usuario autenticado y poblar el formulario
async function cargarUsuario() {
  try {
    const res = await fetch('/api/perfil/usuario');
    const json = await res.json();
    if (res.ok && json.ok && json.data) {
      const row = json.data;
      const nameInput = document.getElementById('nombreUsuario');
      const emailInput = document.getElementById('correoUsuario');
      if (nameInput) nameInput.value = row.nombre || row.usuario || '';
      if (emailInput) emailInput.value = row.correo || '';
      window._perfil_initial = { nombre: nameInput ? nameInput.value : '', correo: emailInput ? emailInput.value : '' };
    } else {
      // fallback: mantener valores actuales del DOM
      const nameInput = document.getElementById('nombreUsuario');
      const emailInput = document.getElementById('correoUsuario');
      window._perfil_initial = { nombre: nameInput ? nameInput.value : '', correo: emailInput ? emailInput.value : '' };
    }
  } catch (err) {
    console.warn('No se pudieron cargar los datos del usuario:', err);
    const nameInput = document.getElementById('nombreUsuario');
    const emailInput = document.getElementById('correoUsuario');
    window._perfil_initial = { nombre: nameInput ? nameInput.value : '', correo: emailInput ? emailInput.value : '' };
  }
}

document.getElementById("formUsuario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombreUsuario = document.getElementById("nombreUsuario").value.trim();
    const correoUsuario = document.getElementById("correoUsuario").value.trim();

    const msj = document.getElementById("mensajeUsuario");

    // Si el usuario no cambió ni el nombre ni el correo, mostrar aviso y no enviar
    if (window._perfil_initial && nombreUsuario === window._perfil_initial.nombre && correoUsuario === window._perfil_initial.correo) {
      const warnHtml = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          No hubo cambios: el usuario y el correo son los mismos.
        </div>`;
      if (msj) msj.innerHTML = warnHtml;
      else showModalMessage('Atención', 'No hubo cambios: el usuario y el correo son los mismos.', 'danger');
      return;
    }
      const resp = await fetch("/api/perfil/cambiar-correo", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreUsuario, correoUsuario })
      });
    const data = await resp.json();

    if (data.ok) {
      const successHtml = `
        <div class="alert alert-success">
          <i class="bi bi-check-circle me-2"></i>
          Datos actualizados correctamente.
        </div>`;
      if (msj) msj.innerHTML = successHtml;
      else showModalMessage('Éxito', 'Datos actualizados correctamente', 'success');
      // Mantener los valores en los campos del formulario (último usuario/correo cambiado)
      try {
        const nameInput = document.getElementById('nombreUsuario');
        const emailInput = document.getElementById('correoUsuario');
        if (nameInput) nameInput.value = nombreUsuario;
        if (emailInput) emailInput.value = correoUsuario;
        // Actualizar referencia inicial para futuros checks
        if (window._perfil_initial) {
          window._perfil_initial.nombre = nombreUsuario;
          window._perfil_initial.correo = correoUsuario;
        }
      } catch (e) {
        // si algo falla, no interrumpir la UX
        console.warn('No se pudieron actualizar los campos de usuario en el DOM', e);
      }
    } else {
      const errorHtml = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-circle me-2"></i>
          Error: ${data.message}
        </div>`;
      if (msj) msj.innerHTML = errorHtml;
      else showModalMessage('Error', data.message || 'Error actualizando', 'danger');
    }
  });





// ====MOSTRAR / OCULTAR CONTRASEÑA ======
function ocultarPass(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  const iconId = 'icon' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1);
  const icon = document.getElementById(iconId);

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.classList.remove('bi-eye');
      icon.classList.add('bi-eye-slash');
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.classList.remove('bi-eye-slash');
      icon.classList.add('bi-eye');
    }
  }
}


// ===FUNCION CAMBIAR DE CONTRASEÑA===
const formContrasena = document.getElementById("formContrasena");

if (formContrasena) {
  formContrasena.addEventListener("submit", async (e) => {
    e.preventDefault();

    const actual = document.getElementById("contrasenaActual").value;
    const nueva = document.getElementById("contrasenaNueva").value;
    const confirmar = document.getElementById("contrasenaConfirmar").value;

    // Validacion de coinciden
    if (nueva !== confirmar) {
      const msjPass = document.getElementById('mensajeContrasena');
      const errHtml = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-circle me-2"></i>
          La nueva contraseña no coincide.
        </div>`;
      if (msjPass) msjPass.innerHTML = errHtml; else alert('La nueva contraseña no coincide.');
      return;
    }

    // Validacion de contraseña robusta
    const regexContrasena = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!regexContrasena.test(nueva)) {
      const msjPass = document.getElementById('mensajeContrasena');
      const errHtml = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-circle me-2"></i>
          La contraseña debe tener mínimo 8 caracteres, incluir al menos una letra y un número.
        </div>`;
      if (msjPass) msjPass.innerHTML = errHtml; else alert('La contraseña debe tener mínimo 8 caracteres, incluir al menos una letra y un número.');
      return;
    }

    try {
      const respuesta = await fetch("/api/perfil/cambiar-contrasena", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva })
      });

      const data = await respuesta.json();

      const msjPass = document.getElementById('mensajeContrasena');
      if (respuesta.ok) {
        const okHtml = `
          <div class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            ${data.mensaje || 'Contraseña cambiada correctamente'}
          </div>`;
        if (msjPass) msjPass.innerHTML = okHtml; else alert(data.mensaje || 'Contraseña cambiada correctamente');
        // limpiar campos
        try {
          document.getElementById('contrasenaActual').value = '';
          document.getElementById('contrasenaNueva').value = '';
          document.getElementById('contrasenaConfirmar').value = '';
        } catch (e) {}
      } else {
        const errHtml = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle me-2"></i>
            ${data.mensaje || 'No se pudo cambiar la contraseña'}
          </div>`;
        if (msjPass) msjPass.innerHTML = errHtml; else alert(data.mensaje || 'No se pudo cambiar la contraseña');
      }

    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      const msjPass = document.getElementById('mensajeContrasena');
      const errHtml = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-circle me-2"></i>
          Error cambiando contraseña
        </div>`;
      if (msjPass) msjPass.innerHTML = errHtml; else alert('Error cambiando contraseña');
    }
  });
}

// Ejecutar al cargar la página
cargarVistaPrevia();
cargarUsuario();
// Cargar personalización (nombrePlataforma, eslogan, colores) para que persista tras recargar
cargarPersonalizacionEnPreview();





// Archivo: multa.js

document.addEventListener("DOMContentLoaded", () => {

  const formMulta = document.getElementById("formMultaConfig");
  const mensajeMulta = document.getElementById("mensajeMultaConfig");

  // Función para mostrar mensajes
  const mostrarMensaje = (texto, tipo = "success") => {
    mensajeMulta.innerHTML = `<div class="alert alert-${tipo}">${texto}</div>`;
    setTimeout(() => mensajeMulta.innerHTML = "", 4000);
  };

  // Obtener configuración actual de multa al cargar la página
  const cargarMulta = async () => {
    try {
      const res = await fetch("/api/perfil/multa", { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.data) {
        document.getElementById("valorMulta").value = data.data.valor_multa || "1.00";
        document.getElementById("diasTolerancia").value = data.data.dias_tolerancia || "0";
      }
    } catch (error) {
      console.error("Error al cargar la multa:", error);
    }
  };

  cargarMulta();



  // FORMULARIO GUARDAR MULTA
  formMulta.addEventListener("submit", async (e) => {
    e.preventDefault();

    const valorMulta = document.getElementById("valorMulta").value;
    const diasTolerancia = document.getElementById("diasTolerancia").value;

    try {
      const res = await fetch("/api/perfil/multa", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor_multa: valorMulta, dias_tolerancia: diasTolerancia })
      });

      const data = await res.json();
      if (data.ok) {
        mostrarMensaje("Configuración de multa guardada correctamente.", "success");
      } else {
        mostrarMensaje(data.mensaje || "Error al guardar configuración.", "danger");
      }
    } catch (error) {
      console.error("Error al guardar multa:", error);
      mostrarMensaje("Error al conectar con el servidor.", "danger");
    }
  });

});






// FORMIULARIO SMTP AUTOMÁTICO
const proveedor = document.getElementById("smtpProveedor");
const extra = document.getElementById("extraConfig");
const host = document.getElementById("smtpHost");
const puerto = document.getElementById("smtpPuerto");

proveedor.addEventListener("change", () => {
  const value = proveedor.value;

  if (value === "gmail") {
    extra.style.display = "none";
    host.value = "smtp.gmail.com";
    puerto.value = 587;
  } 
  
  else if (value === "outlook") {
    extra.style.display = "none";
    host.value = "smtp.office365.com";
    puerto.value = 587;
  }

  else if (value === "yahoo") {
    extra.style.display = "none";
    host.value = "smtp.mail.yahoo.com";
    puerto.value = 465;
  }

  else if (value === "otro") {
    extra.style.display = "block";
    host.value = "";
    puerto.value = "";
  }
});



// FUNCION PARA MOSTRRAR EL CODIGO QR DE WHATSAPP
async function mostrarQR() {
  const res = await fetch("/api/wpp/qr");
  const data = await res.json();

  if (data.ok) {
    document.getElementById("qrImage").src = data.qr;
    document.getElementById("qrContainer").style.display = "block";
  } else {
    alert(data.message);
  }
}



// PERSONALIZACUION DE COLORES Y ESLOGAN
const form = document.getElementById("formPersonalizacion");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombrePlataforma: document.getElementById('nombrePlataforma').value,
    eslogan: document.getElementById('eslogan').value,
    colorPrimario: document.getElementById('colorPrimario').value,
    colorSecundario: document.getElementById('colorSecundario').value,
    colorAcento: document.getElementById('colorAcento').value,
  };

  const req = await fetch("/api/perfil/personalizacion", {
    method: "POST",
    credentials: 'include',
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });

  const res = await req.json();
  // Actualizar vista previa con los valores guardados (o con los valores del formulario como fallback)
  const nombrePlataformaGuardado = (res && res.data && (res.data.nombrePlataforma || res.data.nombre)) || document.getElementById('nombrePlataforma').value;
  const esloganGuardado = (res && res.data && res.data.eslogan) || document.getElementById('eslogan').value;

  const previewPlataformaEl = document.getElementById('previewNombrePlataforma');
  const previewEsloganEl = document.getElementById('previewEslogan');
  const previewNombreInstitucionEl = document.getElementById('previewNombreInstitucion');
  if (previewPlataformaEl) previewPlataformaEl.textContent = nombrePlataformaGuardado;
  if (previewEsloganEl) previewEsloganEl.textContent = esloganGuardado;
  // No sobreescribir el título principal de la vista previa (nombre de la institución)

  // Actualizar colores en las badgets de la vista previa
  const badges = document.querySelectorAll('.preview-badge');
  try {
    const cp = document.getElementById('colorPrimario').value;
    const cs = document.getElementById('colorSecundario').value;
    const ca = document.getElementById('colorAcento').value;
    if (badges[0]) badges[0].style.backgroundColor = cp;
    if (badges[1]) badges[1].style.backgroundColor = cs;
    if (badges[2]) badges[2].style.backgroundColor = ca;
  } catch (e) {
    // ignorar si no existen inputs
  }

  // Mostrar modal de resultado (usar la misma función que en otras vistas)
  if (req.ok) {
    showModalMessage('Éxito', res.mensaje || 'Personalización guardada correctamente', 'success');
  } else {
    showModalMessage('Error', res.mensaje || res.message || 'Error guardando personalización', 'danger');
  }
});

// Vista previa en tiempo real (mapear cada input de color a la badge correspondiente)
const colorInputs = Array.from(document.querySelectorAll("input[type=color]"));
const previewBadges = Array.from(document.querySelectorAll('.preview-badge'));
colorInputs.forEach((input, idx) => {
  input.addEventListener('input', () => {
    const badge = previewBadges[idx];
    if (badge) badge.style.backgroundColor = input.value;
  });
});

// Sincronizar nombre de la institución en la vista previa en tiempo real
const nombreInstitucionInput = document.getElementById('nombreInstitucion');
const previewNombreInstitucionEl = document.getElementById('previewNombreInstitucion');
if (nombreInstitucionInput && previewNombreInstitucionEl) {
  nombreInstitucionInput.addEventListener('input', () => {
    previewNombreInstitucionEl.textContent = nombreInstitucionInput.value || 'Universidad Nacional de Educación';
  });
}

// Sincronizar nombre de la plataforma y eslogan en la vista previa en tiempo real
const nombrePlataformaInput = document.getElementById('nombrePlataforma');
const previewNombrePlataformaEl = document.getElementById('previewNombrePlataforma');
const esloganInput = document.getElementById('eslogan');
const previewEsloganEl = document.getElementById('previewEslogan');
if (nombrePlataformaInput && previewNombrePlataformaEl) {
  nombrePlataformaInput.addEventListener('input', () => {
    previewNombrePlataformaEl.textContent = nombrePlataformaInput.value || 'Sistema de Gestión Bibliotecaria';
  });
}
if (esloganInput && previewEsloganEl) {
  esloganInput.addEventListener('input', () => {
    previewEsloganEl.textContent = esloganInput.value || 'Fomentando el amor por la lectura';
  });
}

// Actualizar el campo de texto al lado del input[type=color] para mostrar el hex seleccionado
document.querySelectorAll('.input-group').forEach(group => {
  const colorInput = group.querySelector('input[type=color]');
  const textInput = group.querySelector('input[type=text]');
  if (colorInput && textInput) {
    // establecer inicial
    textInput.value = colorInput.value;
    colorInput.addEventListener('input', () => {
      textInput.value = colorInput.value;
    });
  }
});