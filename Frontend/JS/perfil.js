
// Función reutilizable para mostrar mensajes en modal
function showModalMessage(title, message, type = 'primary') {
  // Mostrar mensaje inline dentro de #mensajeBeneficio (si existe)
  const cont = document.getElementById('mensajeBeneficio');
  const status = document.getElementById('qrStatus');
  const cls = (type === 'success') ? 'success' : (type === 'danger') ? 'danger' : 'primary';
  const icon = (type === 'success') ? 'bi-check-circle' : (type === 'danger') ? 'bi-exclamation-circle' : 'bi-info-circle';
  const html = ` <div class="alert alert-${cls}"><i class="bi ${icon} me-2"></i><strong>${title}</strong> - ${message}</div>`;

  if (cont) {
    cont.innerHTML = html;
    // limpiar automáticamente después de 6s
    setTimeout(() => { try { cont.innerHTML = ''; } catch(e){} }, 6000);
    return;
  }
  if (status) {
    status.innerHTML = html;
    setTimeout(() => { try { status.innerHTML = ''; } catch(e){} }, 6000);
    // also show a toast for better visibility
    tryShowToast(title, message, type);
    return;
  }

  // Si no existen contenedores inline, mostrar toast si es posible
  tryShowToast(title, message, type) || alert(title + " - " + message);
}

// Crear y mostrar un toast Bootstrap (devuelve true si se mostró uno)
function tryShowToast(title, message, type = 'primary') {
  try {
    const container = document.getElementById('toastContainer');
    if (!container || !window.bootstrap || !window.bootstrap.Toast) return false;
    const cls = (type === 'success') ? 'bg-success text-white' : (type === 'danger') ? 'bg-danger text-white' : 'bg-primary text-white';

    const toastId = 'toast_' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.className = 'toast ';
    toastEl.id = toastId;
    toastEl.role = 'status';
    toastEl.ariaLive = 'polite';
    toastEl.ariaAtomic = 'true';
    toastEl.innerHTML = `
      <div class="toast-header ${cls}">
        <strong class="me-auto">${title}</strong>
        <small class="text-muted">ahora</small>
        <button type="button" class="btn-close btn-close-white ms-2 mb-1" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>`;

    container.appendChild(toastEl);
    const bsToast = new window.bootstrap.Toast(toastEl, { delay: 6000 });
    bsToast.show();

    // limpiar el DOM cuando termine
    toastEl.addEventListener('hidden.bs.toast', () => { try { container.removeChild(toastEl); } catch (e) {} });
    return true;
  } catch (e) {
    return false;
  }
}

// Función para mostrar un modal de confirmación que devuelve una Promise<boolean>
function showConfirm(title, message, okText = 'Aceptar', cancelText = 'Cancelar', type = 'primary') {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('modalConfirm');
    const header = document.getElementById('modalConfirmHeader');
    const titleEl = document.getElementById('modalConfirmTitulo');
    const bodyEl = document.getElementById('modalConfirmBody');
    const okBtn = document.getElementById('modalConfirmOk');
    const cancelBtn = document.getElementById('modalConfirmCancel');

    if (!modalEl || !okBtn || !cancelBtn) {
      // Fallback a confirm() si no existe el modal en el DOM
      try { resolve(confirm(message)); } catch (e) { resolve(false); }
      return;
    }

    header.classList.remove('bg-success', 'bg-danger', 'bg-primary', 'text-white');
    if (type === 'success') header.classList.add('bg-success', 'text-white');
    else if (type === 'danger') header.classList.add('bg-danger', 'text-white');
    else header.classList.add('bg-primary', 'text-white');

    if (titleEl) titleEl.textContent = title || '';
    if (bodyEl) bodyEl.textContent = message || '';
    okBtn.textContent = okText || 'Aceptar';
    cancelBtn.textContent = cancelText || 'Cancelar';

    const bsModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);

    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const onOk = () => { cleanup(); bsModal.hide(); resolve(true); };
    const onCancel = () => { cleanup(); bsModal.hide(); resolve(false); };
    const onHidden = () => { cleanup(); resolve(false); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modalEl.addEventListener('hidden.bs.modal', onHidden);

    bsModal.show();
  });
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
  // incluir el correo SMTP si el formulario lo tiene
  const smtpInput = document.getElementById('smtpCorreo');
  if (smtpInput && smtpInput.value) formData.append('smtpCorreo', smtpInput.value);

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
      // si el backend devolvió correo, actualizar el campo smtpCorreo
      try {
        const smtpField = document.getElementById('smtpCorreo');
        if (smtpField) smtpField.value = saved.correo || document.getElementById('smtpCorreo').value || '';
      } catch (e) {}
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
    // Rellenar campo smtpCorreo si existe en la fila
    const smtpField = document.getElementById('smtpCorreo');
    if (smtpField) smtpField.value = row.correo || row.smtp_correo || row.smtpCorreo || row.email || '';
    const provField = document.getElementById('smtpProveedor');
    if (provField) provField.value = row.smtp_proveedor || row.smtpProveedor || provField.value || 'gmail';
    const hostField = document.getElementById('smtpHost');
    if (hostField) hostField.value = row.smtp_host || row.smtpHost || '';
    const puertoField = document.getElementById('smtpPuerto');
    if (puertoField) puertoField.value = row.smtp_puerto || row.smtpPuerto || '';
    // Rellenar contraseña SMTP con lo guardado para que permanezca en el formulario hasta que se cambie
    const passField = document.getElementById('smtpContrasena');
    if (passField) passField.value = row.smtp_contrasena || row.smtpContrasena || '';

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

// Ejecutar inicializaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('Perfil: DOMContentLoaded - iniciando cargas iniciales');
  cargarVistaPrevia();
  cargarUsuario();
  // Cargar personalización (nombrePlataforma, eslogan, colores) para que persista tras recargar
  cargarPersonalizacionEnPreview();
  // Cargar estado WhatsApp
  cargarEstadoWhatsApp();
});

// Actualizar badge de estado de WhatsApp
async function cargarEstadoWhatsApp() {
  console.log('Perfil: cargando estado WhatsApp...');
  try {
    const res = await fetch('/api/wpp/status');
    const json = await res.json();
    console.log('Perfil: estado WhatsApp response', json);
    if (json && json.ok && json.data) {
      updateWhatsAppBadge(!!json.data.connected);
    }
  } catch (e) {
    console.warn('No se pudo cargar estado WhatsApp:', e);
  }
}

function updateWhatsAppBadge(connected) {
  const badge = document.getElementById('whatsappBadge');
  const qrStatus = document.getElementById('qrStatus');
  if (!badge) return;
  if (connected) {
    badge.classList.remove('bg-secondary');
    badge.classList.add('bg-success');
    badge.textContent = 'Conectado';
    if (qrStatus) qrStatus.innerHTML = `<div class="alert alert-success mb-0"><i class="bi bi-check-circle me-2"></i>WhatsApp está conectado.</div>`;
  } else {
    badge.classList.remove('bg-success');
    badge.classList.add('bg-secondary');
    badge.textContent = 'Desconectado';
    if (qrStatus) qrStatus.innerHTML = '';
  }
}

cargarEstadoWhatsApp();





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

  // Manejar envío del formulario SMTP y mostrar modal como los demás formularios
  const formSMTP = document.getElementById('formSMTP');
  if (formSMTP) {
    formSMTP.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const proveedor = document.getElementById('smtpProveedor').value;
      const correo = document.getElementById('smtpCorreo').value;
      const contrasena = document.getElementById('smtpContrasena').value;
      const host = document.getElementById('smtpHost').value;
      const puerto = document.getElementById('smtpPuerto').value;

      const mensajeEl = document.getElementById('mensajeSMTP');
      try {
        const resp = await fetch('/api/perfil/smtp', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proveedor, correo, contrasena, host, puerto })
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          // Mostrar mensaje inline (coherente con los demás formularios)
          if (mensajeEl) mensajeEl.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i>${data.mensaje || 'Configuración SMTP guardada'}</div>`;
          // Mantener los valores en el formulario (el usuario pidió que se quede hasta que se cambie)
        } else {
          if (mensajeEl) mensajeEl.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>${(data && data.mensaje) || 'Error guardando configuración SMTP'}</div>`;
        }
      } catch (err) {
        console.error('Error guardando SMTP:', err);
        if (mensajeEl) mensajeEl.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Error de red al guardar configuración SMTP</div>`;
      }
      // Borrar el mensaje automáticamente después de 4s para limpiar la UI
      try { if (mensajeEl) setTimeout(() => { if (mensajeEl) mensajeEl.innerHTML = ''; }, 4000); } catch(e) {}
    });
  }



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







// FORMULARIO SMTP AUTOMÁTICO
const proveedor = document.getElementById("smtpProveedor");
const extra = document.getElementById("extraConfig");
const host = document.getElementById("smtpHost");
const puerto = document.getElementById("smtpPuerto");
const formSMTP = document.getElementById("formSMTP");

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


// GUARDAR CONFIGURACIÓN SMTP
formSMTP.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    proveedor: proveedor.value,
    correo: document.getElementById("smtpCorreo").value,
    contrasena: document.getElementById("smtpContrasena").value,
    host: host.value,
    puerto: puerto.value
  };

  const request = await fetch("/api/perfil/smtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const response = await request.json();

  if (response.ok) {
  } else {
    alert("Error al guardar SMTP");
  }
});



// Variable para controlar el polling de estado de WhatsApp
let whatsappPollingInterval = null;

// Iniciar polling para verificar el estado de conexión de WhatsApp
function iniciarPollingWhatsApp() {
  // Limpiar cualquier polling anterior
  detenerPollingWhatsApp();
  
  // Verificar cada 3 segundos si se conectó
  whatsappPollingInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/wpp/status');
      const json = await res.json();
      if (json && json.ok && json.data && json.data.connected) {
        // WhatsApp se conectó, actualizar UI
        updateWhatsAppBadge(true);
        // Ocultar el QR y mostrar mensaje de éxito
        const qrContainer = document.getElementById('qrContainer');
        const qrStatus = document.getElementById('qrStatus');
        if (qrContainer) qrContainer.style.display = 'none';
        if (qrStatus) {
          qrStatus.innerHTML = `<div class="alert alert-success mb-0"><i class="bi bi-check-circle me-2"></i>¡WhatsApp conectado exitosamente!</div>`;
          setTimeout(() => { try { if (qrStatus) qrStatus.innerHTML = ''; } catch(e){} }, 5000);
        }
        // Detener el polling una vez conectado
        detenerPollingWhatsApp();
      }
    } catch (e) {
      console.warn('Error en polling de WhatsApp:', e);
    }
  }, 3000);
}

// Detener el polling de WhatsApp
function detenerPollingWhatsApp() {
  if (whatsappPollingInterval) {
    clearInterval(whatsappPollingInterval);
    whatsappPollingInterval = null;
  }
}

// FUNCION PARA MOSTRRAR EL CODIGO QR DE WHATSAPP
async function mostrarQR() {
  const btn = document.getElementById('btnGenerarQR');
  const loading = document.getElementById('qrLoading');
  const qrContainer = document.getElementById('qrContainer');
  const qrImageWrap = document.getElementById('qrImageWrap');
  try {
    if (btn) btn.disabled = true;
    // mostrar contenedor y spinner en el lugar donde irá el QR
    if (qrContainer) qrContainer.style.display = 'block';
    if (qrImageWrap) qrImageWrap.style.display = 'none';
    if (loading) { loading.classList.remove('d-none'); loading.setAttribute('aria-hidden', 'false'); }

    const res = await fetch("/api/wpp/qr");
    const data = await res.json();
    console.log('Perfil: respuesta /api/wpp/qr', data);

    const img = document.getElementById("qrImage");
    const mensajeBenef = document.getElementById('mensajeBeneficio');
    const qrStatus = document.getElementById('qrStatus');

    // Clear previous status messages
    if (mensajeBenef) mensajeBenef.innerHTML = '';
    if (qrStatus) qrStatus.innerHTML = '';

    if (data && (data.ok || data.qr)) {
      if (img) img.src = data.qr || data.qr;
      // Al generar un QR estamos en proceso de autenticación (no conectado todavía)
      try { updateWhatsAppBadge(false); } catch(e){}
      if (loading) { loading.classList.add('d-none'); loading.setAttribute('aria-hidden', 'true'); }
      if (qrImageWrap) qrImageWrap.style.display = 'block';
      
      // Iniciar polling para detectar cuando se conecte
      iniciarPollingWhatsApp();
    } else {
      // If backend indicates the service is already connected, show message in both places
      const connected = data && (data.connected === true || /conectad/i.test(String(data.message || '')));
      if (connected) {
        const html = `<div class="alert alert-success mb-0"><i class="bi bi-check-circle me-2"></i>WhatsApp ya está vinculado a una cuenta.</div>`;
        if (mensajeBenef) mensajeBenef.innerHTML = html;
        if (qrStatus) qrStatus.innerHTML = html;
        if (loading) { loading.classList.add('d-none'); loading.setAttribute('aria-hidden', 'true'); }
        if (qrContainer) qrContainer.style.display = 'none';
        try { updateWhatsAppBadge(true); } catch(e){}
      } else {
        // ocultar contenedor si no hay QR
        if (loading) { loading.classList.add('d-none'); loading.setAttribute('aria-hidden', 'true'); }
        if (qrContainer) qrContainer.style.display = 'none';
        // show both modal and inline status for clarity
        const errMsg = data && data.message ? data.message : 'No se pudo obtener el QR';
        if (qrStatus) qrStatus.innerHTML = `<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-circle me-2"></i>${errMsg}</div>`;
        showModalMessage('Error', errMsg, 'danger');
      }
    }
  } catch (err) {
    console.error('mostrarQR error:', err);
    showModalMessage('Error', 'Error al generar el QR. Revisa la consola del servidor.', 'danger');
  } finally {
    if (btn) btn.disabled = false;
    if (loading) { loading.classList.add('d-none'); loading.setAttribute('aria-hidden', 'true'); }
  }
}


// Desconectar la sesión de WhatsApp en el servidor y solicitar nuevo QR
async function desconectarWhatsApp() {
  try {
    // Detener polling si está activo
    detenerPollingWhatsApp();
    
    // Usar modal de confirmación en lugar de confirm()
    const confirmed = await showConfirm('Confirmar desconexión', '¿Deseas desconectar WhatsApp?', 'Desconectar', 'Cancelar', 'danger');
    if (!confirmed) return;

    const resp = await fetch('/api/wpp/disconnect', { method: 'POST' });
    const json = await resp.json();
    if (resp.ok && json.ok) {
      showModalMessage('Éxito', json.mensaje || 'Desconectado correctamente.', 'success');
      // No generar QR automáticamente: ocultar cualquier QR mostrado previamente
      try {
        const qrContainer = document.getElementById('qrContainer');
        const qrImage = document.getElementById('qrImage');
        const mensajeBenef = document.getElementById('mensajeBeneficio');
        if (qrContainer) qrContainer.style.display = 'none';
        if (qrImage) qrImage.src = '';
        if (mensajeBenef) mensajeBenef.innerHTML = '';
        try { updateWhatsAppBadge(false); } catch(e){}
      } catch (e) { /* no bloquear por error al limpiar UI */ }
    } else {
      showModalMessage('Error', (json && json.mensaje) || 'Error al desconectar WhatsApp', 'danger');
    }
  } catch (err) {
    console.error('Error desconectando WhatsApp:', err);
    showModalMessage('Error', 'Error al desconectar WhatsApp. Revisa la consola del servidor.', 'danger');
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




// ===FORMULARIO DE BENEFICIOS===

const formBeneficio = document.getElementById("formAgregarBeneficio");
const listaBeneficios = document.getElementById("listaBeneficios"); // EL DIV DONDE SE LISTAN

//. AGREGAR BENEFICIO
formBeneficio.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombreBeneficio").value;
    const descripcion = document.getElementById("descripcionBeneficio").value;

    try {
        const res = await fetch("/api/beneficios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, descripcion })
        });

        const data = await res.json();

        if (data.ok) {
          const cont = document.getElementById('mensajeBeneficio');
            if (cont) {
              cont.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i><strong>Éxito</strong> - ${data.mensaje || 'Beneficio agregado correctamente'}</div>`;
              setTimeout(() => { try { cont.innerHTML = ''; } catch (e) {} }, 6000);
            } else {
              showModalMessage('Éxito', data.mensaje || 'Beneficio agregado correctamente', 'success');
            }
            mostrarBeneficios();        // recargar lista
            formBeneficio.reset();      // limpiar form
        } else {
          const cont = document.getElementById('mensajeBeneficio');
            const errMsg = (data && data.mensaje) || 'Error al guardar el beneficio';
            if (cont) {
              cont.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i><strong>Error</strong> - ${errMsg}</div>`;
              setTimeout(() => { try { cont.innerHTML = ''; } catch (e) {} }, 6000);
            } else {
              showModalMessage('Error', errMsg, 'danger');
            }
        }

    } catch (error) {
        console.error("Error:", error);
      const cont = document.getElementById('mensajeBeneficio');
      if (cont) {
        cont.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i><strong>Error</strong> - Ocurrió un error al guardar el beneficio</div>`;
        setTimeout(() => { try { cont.innerHTML = ''; } catch (e) {} }, 6000);
      } else {
        showModalMessage('Error', 'Ocurrió un error al guardar el beneficio', 'danger');
      }
    }
});

//  LISTAR BENEFICIOS
async function mostrarBeneficios() {
    try {
        const res = await fetch("/api/beneficios");
        const data = await res.json();

        if (!data.ok) {
            console.error("Error al obtener beneficios");
            return;
        }

        const beneficios = data.beneficios; // AQUÍ ESTÁ EL ARRAY REAL

        const tbody = document.querySelector("#tablaBeneficios tbody");
        tbody.innerHTML = "";

        beneficios.forEach((b, index) => {
          tbody.innerHTML += `
            <tr>
              <td>${index + 1}</td>
              <td class="text-start">${b.nombre}</td>
              <td class="text-start">${b.descripcion}</td>
              <td>
                <i class="bi bi-pencil-square text-warning" onclick="editarBeneficio(${b.id_beneficio})" style="cursor:pointer; font-size:1.2rem;" title="Editar"></i>
                <i class="bi bi-trash text-danger ms-3" onclick="eliminarBeneficio(${b.id_beneficio})" style="cursor:pointer; font-size:1.2rem;" title="Eliminar"></i>
              </td>
            </tr>
          `;
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

  
//  ELIMINAR BENEFICIO
async function eliminarBeneficio(id) {
  try {
    const confirmado = await showConfirm('Confirmar eliminación', '¿Seguro que deseas eliminar este beneficio?', 'Eliminar', 'Cancelar', 'danger');
    if (!confirmado) return;

    const res = await fetch(`/api/beneficios/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showModalMessage('Éxito', data.mensaje || 'Beneficio eliminado correctamente', 'success');
      mostrarBeneficios();
    } else {
      showModalMessage('Error', (data && data.mensaje) || 'No se pudo eliminar el beneficio', 'danger');
    }
  } catch (error) {
    console.error("Error eliminando beneficio:", error);
    showModalMessage('Error', 'Ocurrió un error al eliminar el beneficio', 'danger');
  }
}

// Inicializamos la lista al cargar
mostrarBeneficios();

// Función para editar un beneficio: carga datos en el modal y lo muestra
async function editarBeneficio(id) {
  try {
    const resp = await fetch(`/api/beneficios/${id}`);
    const json = await resp.json();

    if (!resp.ok || !json.ok) {
      showModalMessage('Error', (json && json.mensaje) || 'No se pudo cargar el beneficio', 'danger');
      return;
    }

    const b = json.beneficio || json.data || json;
    document.getElementById('editBeneficioId').value = id;
    document.getElementById('editBeneficioNombre').value = b.nombre || '';
    document.getElementById('editBeneficioDescripcion').value = b.descripcion || '';

    // mostrar modal
    try {
      const modalEl = document.getElementById('modalEditarBeneficio');
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    } catch (e) {
      console.warn('Bootstrap modal no disponible todavía:', e);
    }
  } catch (err) {
    console.error('Error cargando beneficio para editar:', err);
    showModalMessage('Error', 'Error cargando datos del beneficio', 'danger');
  }
}

// Exponer la función globalmente para llamadas inline desde HTML
window.editarBeneficio = editarBeneficio;

// Manejador del botón Guardar del modal de edición
const btnGuardarBeneficio = document.getElementById('btnGuardarBeneficio');
if (btnGuardarBeneficio) {
  btnGuardarBeneficio.addEventListener('click', async (e) => {
    const id = document.getElementById('editBeneficioId').value;
    const nombre = document.getElementById('editBeneficioNombre').value.trim();
    const descripcion = document.getElementById('editBeneficioDescripcion').value.trim();

    if (!nombre) {
      const msgEl = document.getElementById('mensajeEditarBeneficio');
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">El nombre es obligatorio.</div>`;
      return;
    }

    try {
      const resp = await fetch(`/api/beneficios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion })
      });
      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        const msgEl = document.getElementById('mensajeBeneficio');
        if (msgEl) msgEl.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i>Beneficio actualizado correctamente</div>`;
        // ocultar modal
        try { const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarBeneficio')); if (modal) modal.hide(); } catch(e){}
        mostrarBeneficios();
        setTimeout(() => { try { if (msgEl) msgEl.innerHTML = ''; } catch(e){} }, 4000);
      } else {
        const errMsg = (data && data.mensaje) || 'No se pudo actualizar el beneficio';
        const msgEl = document.getElementById('mensajeEditarBeneficio');
        if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${errMsg}</div>`;
      }
    } catch (err) {
      console.error('Error actualizando beneficio:', err);
      const msgEl = document.getElementById('mensajeEditarBeneficio');
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">Ocurrió un error al actualizar el beneficio</div>`;
    }
  });
}
