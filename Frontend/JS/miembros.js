document.addEventListener("DOMContentLoaded", () => {
  // Base de la API para evitar problemas de puertos (p.ej. 8080 vs 3000)
  const BASE_URL = window.location.origin.includes('localhost')
    ? 'http://localhost:3000'
    : window.location.origin;

  const form = document.getElementById("formMiembro");
  const tablaMiembros = document.getElementById("tablaMiembros");
  const buscador = document.getElementById("buscadorMiembro");
  const filtroTipo = document.getElementById("filtroTipo");
  // Estado de filtros actuales (texto y tipo) para reutilizar entre llamadas
  let filtroTextoActual = "";
  let filtroTipoActual = "";
  let miembroEditandoId = null;
  let idAEliminar = null;

  // Envío del formulario (Agregar o Editar)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Helper to set/clear error text safely (only if the element exists)
    const setError = (id, message) => {
      const el = document.getElementById(id);
      if (el) el.textContent = message;
    };

    // Clear previous errors (if the placeholders exist)
    setError("errorNombres", "");
    setError("errorApellidos", "");
    setError("errorEmail", "");

    // Obtener valores del formulario (use optional chaining in case inputs are missing)
    const nuevoMiembro = {
      id: document.getElementById("idMiembro")?.value || "",
      nombres: (document.getElementById("nombres")?.value || "").trim(),
      apellidos: (document.getElementById("apellidos")?.value || "").trim(),
      email: (document.getElementById("email")?.value || "").trim(),
      direccion: (document.getElementById("direccion")?.value || "").trim(),
      celular: (document.getElementById("celular")?.value || "").trim(),
      fecha_inscripcion: document.getElementById("fechaInscripcion")?.value || ""
    };

    // Limpiar errores previos
    ["errorId", "errorNombres", "errorApellidos", "errorEmail", "errorCelular", "errorFecha"].forEach(id => {
      const elem = document.getElementById(id);
      if (elem) elem.textContent = "";
    });

    let valido = true;

    //validar Identificación
    if (!/^\d{8,10}$/.test(nuevoMiembro.id)) {
      const el = document.getElementById("errorId");
      if (el) el.textContent = "El Id debe tener entre 8 y 10 dígitos.";
      valido = false;
    }


    // Validar nombres
    if (!nuevoMiembro.nombres || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(nuevoMiembro.nombres)) {
      const el = document.getElementById("errorNombres");
      if (el) el.textContent = "Nombre inválido. Solo letras y espacios.";
      valido = false;
    }

    // Validar apellidos
    if (!nuevoMiembro.apellidos || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(nuevoMiembro.apellidos)) {
      const el = document.getElementById("errorApellidos");
      if (el) el.textContent = "Apellido inválido. Solo letras y espacios.";
      valido = false;
    }

    // Validar email
    if (!nuevoMiembro.email || !/^\S+@\S+\.\S+$/.test(nuevoMiembro.email)) {
      const el = document.getElementById("errorEmail");
      if (el) el.textContent = "Email inválido.";
      valido = false;
    }

    // Validar celular
    if (!/^\d{10}$/.test(nuevoMiembro.celular)) {
      const el = document.getElementById("errorCelular");
      if (el) el.textContent = "El celular debe tener exactamente 10 números.";
      valido = false;
    }

    if (!valido) return;

    // Validar unicidad de Id, email y celular consultando miembros existentes
    try {
      const duplicates = await validarUnicidad(nuevoMiembro, miembroEditandoId);
      let hasDup = false;
      if (duplicates.id) {
        const el = document.getElementById("errorId");
        if (el) el.textContent = "Ya existe un usuario con este Id.";
        hasDup = true;
      }
      if (duplicates.email) {
        const el = document.getElementById("errorEmail");
        if (el) el.textContent = "Ya existe un usuario con este correo.";
        hasDup = true;
      }
      if (duplicates.celular) {
        const el = document.getElementById("errorCelular");
        if (el) el.textContent = "Ya existe un usuario con ese número de celular.";
        hasDup = true;
      }
      if (hasDup) return;
    } catch (err) {
      // Si falla la validación remota/local, dejamos continuar y que el servidor valide estrictamente
      console.warn('No se pudo validar unicidad en cliente:', err);
    }


    try {
      let url = `${BASE_URL}/api/miembros`;
      let method = "POST";

      if (miembroEditandoId) {
        url += `/${miembroEditandoId}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(nuevoMiembro)
      });

      const data = await response.json();

      if (response.ok) {
        mostrarModalMensaje(
          "Éxito",
          miembroEditandoId ? "Miembro actualizado correctamente" : "Miembro registrado correctamente",
          "success"
        );
        form.reset();
        miembroEditandoId = null;
        cargarMiembros(filtroTextoActual, filtroTipoActual);
        const modal = bootstrap.Modal.getInstance(document.getElementById("modalMiembro"));
        modal.hide();
      } else {
        mostrarModalMensaje("Error", data.error || "Error al guardar miembro", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      mostrarModalMensaje("Error", "No se pudo procesar la solicitud", "error");
    }
  });

  // Cargar miembros desde la BD (acepta filtro de texto y filtro por tipo: "Activo" | "Inactivo" | "")
  async function cargarMiembros(filtroTexto = "", tipo = "") {
    try {
      // Guardar estado de filtros actuales
      filtroTextoActual = filtroTexto || "";
      filtroTipoActual = tipo || "";

      let url = `${BASE_URL}/api/miembros`;
      if (filtroTexto && filtroTexto.trim() !== "") {
        // Usar endpoint de búsqueda del backend
        url = `${BASE_URL}/api/miembros/buscar?filtro=${encodeURIComponent(filtroTexto)}`;
      }
      const response = await fetch(url, { credentials: "include" });
      const miembros = await response.json();

      tablaMiembros.innerHTML = "";

      // Si el usuario solicitó filtrar por estado, aplicar filtro en cliente
      let lista = Array.isArray(miembros) ? miembros : [];
      if (tipo === "Activo") {
        lista = lista.filter(m => m.activo === 1 || m.activo === '1' || m.activo === true || m.activo === 'true');
      } else if (tipo === "Inactivo") {
        lista = lista.filter(m => m.activo === 0 || m.activo === '0' || m.activo === false || m.activo === 'false');
      }

      lista.forEach(miembro => {
        const fila = document.createElement("tr");
        // Mostrar acciones diferentes según el estado activo
        const fechaText = miembro.fecha_inscripcion ? new Date(miembro.fecha_inscripcion).toLocaleDateString('es-CO') : '';
        if (miembro.activo === 0 || miembro.activo === '0' || miembro.activo === false) {
          fila.innerHTML = `
            <td>${miembro.id}</td>
            <td>${miembro.nombres}</td>
            <td>${miembro.apellidos}</td>
            <td>${miembro.email}</td>
            <td>${miembro.direccion}</td>
            <td>${miembro.celular}</td>
            <td>${fechaText}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary btn-activar" data-id="${miembro.id_miembro}">Inactivo</button>
            </td>
          `;
        } else {
          fila.innerHTML = `
            <td>${miembro.id}</td>
            <td>${miembro.nombres}</td>
            <td>${miembro.apellidos}</td>
            <td>${miembro.email}</td>
            <td>${miembro.direccion}</td>
            <td>${miembro.celular}</td>
            <td>${fechaText}</td>
            <td>
                <i class="bi bi-eye text-primary btn-ver" data-id="${miembro.id_miembro}" style="cursor:pointer; font-size:1.2rem;" title="Ver detalle"></i>
                <i class="bi bi-pencil-square text-warning btn-editar" data-id="${miembro.id_miembro}" style="cursor:pointer; font-size:1.2rem; margin-left:8px;" title="Editar"></i>
                <i class="bi bi-trash text-danger btn-inactivar" data-id="${miembro.id_miembro}" style="cursor:pointer; font-size:1.2rem; margin-left:8px;" title="Inactivar"></i>
            </td>
          `;
        }
        tablaMiembros.appendChild(fila);
      });
    } catch (error) {
      console.error("Error al cargar miembros:", error);
    }
  }

  // Debounce helper para evitar demasiadas peticiones
  function debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Valida unicidad de campos (id, email, celular) consultando la lista de miembros
  // Excluye el miembro en edición si se proporciona su id de base de datos (id_miembro)
  async function validarUnicidad(nuevoMiembro, excluirId_miembro = null) {
    const result = { id: false, email: false, celular: false };
    try {
      const resp = await fetch(`${BASE_URL}/api/miembros`, { credentials: 'include' });
      if (!resp.ok) return result; // no available data to validate
      const miembros = await resp.json();
      if (!Array.isArray(miembros)) return result;

      const idToCheck = (nuevoMiembro.id || '').trim();
      const emailToCheck = (nuevoMiembro.email || '').trim().toLowerCase();
      const celToCheck = (nuevoMiembro.celular || '').trim();

      for (const m of miembros) {
        // Cuando se edita, excluir el mismo registro
        if (excluirId_miembro && String(m.id_miembro) === String(excluirId_miembro)) continue;

        if (idToCheck && String(m.id) === String(idToCheck)) result.id = true;
        if (emailToCheck && String(m.email).toLowerCase() === emailToCheck) result.email = true;
        if (celToCheck && String(m.celular) === String(celToCheck)) result.celular = true;

        // Si ya encontramos todas las coincidencias, terminar
        if (result.id && result.email && result.celular) break;
      }

      return result;
    } catch (err) {
      console.warn('Error validando unicidad:', err);
      return result;
    }
  }

  // Manejo del buscador
  const handleBuscar = debounce(() => {
    const valor = buscador ? buscador.value.trim() : "";
    const tipo = filtroTipo ? filtroTipo.value : "";
    filtroTextoActual = valor;
    filtroTipoActual = tipo;

    // Llamar cargarMiembros con ambos filtros
    cargarMiembros(valor, tipo);
  }, 300);

  if (buscador) buscador.addEventListener('input', handleBuscar);
  if (filtroTipo) filtroTipo.addEventListener('change', () => {
    // Actualizar filtros actuales y recargar
    const valor = buscador ? buscador.value.trim() : "";
    const tipo = filtroTipo.value;
    filtroTextoActual = valor;
    filtroTipoActual = tipo;
    cargarMiembros(valor, tipo);
  });

  // Click en Ver / Editar / Eliminar
  tablaMiembros.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btn-ver")) {
      const id = e.target.dataset.id;
      verDetalleMiembro(id);
    }

    if (e.target.classList.contains("btn-editar")) {
      const id = e.target.dataset.id;
      miembroEditandoId = id;

      const response = await fetch(`${BASE_URL}/api/miembros/${id}`, { credentials: "include" });
      const miembro = await response.json();

      document.getElementById("idMiembro").value = miembro.id; 
      document.getElementById("nombres").value = miembro.nombres;
      document.getElementById("apellidos").value = miembro.apellidos;
      document.getElementById("email").value = miembro.email;
      document.getElementById("direccion").value = miembro.direccion;
      document.getElementById("celular").value = miembro.celular;
      // Asegurarse de establecer el input[type=date] en formato YYYY-MM-DD
      const fechaInput = document.getElementById("fechaInscripcion");
      if (fechaInput) {
        if (miembro.fecha_inscripcion) {
          const d = new Date(miembro.fecha_inscripcion);
          if (!isNaN(d)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            fechaInput.value = `${yyyy}-${mm}-${dd}`;
          } else {
            // Si no es una fecha válida, intentar asignar la cadena tal cual
            fechaInput.value = miembro.fecha_inscripcion;
          }
        } else {
          fechaInput.value = '';
        }
      }

      const modal = new bootstrap.Modal(document.getElementById("modalMiembro"));
      modal.show();
    }

    if (e.target.classList.contains("btn-inactivar")) {
      // Mostrar confirmación y llamar al endpoint para marcar inactivo
      idAEliminar = e.target.dataset.id;
      const modalConfirmar = new bootstrap.Modal(document.getElementById("modalConfirmar"));
      modalConfirmar.show();

      const btnConfirmar = document.getElementById("btnConfirmarEliminar");
      btnConfirmar.onclick = async () => {
        try {
          const response = await fetch(`${BASE_URL}/api/miembros/${idAEliminar}/estado`, {
            method: "PATCH",
            credentials: "include",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: false })
          });
          const data = await response.json();

          if (response.ok) {
            mostrarToast("Miembro inactivado correctamente", "success");
            cargarMiembros(filtroTextoActual, filtroTipoActual);
          } else {
            mostrarToast("Error al inactivar miembro: " + (data.error || data.mensaje), "danger");
          }
        } catch (error) {
          console.error("Error al inactivar miembro:", error);
          mostrarToast("No se pudo inactivar el miembro", "danger");
        }
        modalConfirmar.hide();
      };
    }

    // Reactivar miembro desde el botón 'Inactivo'
    if (e.target.classList.contains('btn-activar')) {
      const id = e.target.dataset.id;
      try {
        const response = await fetch(`${BASE_URL}/api/miembros/${id}/estado`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: true })
        });
        const data = await response.json();
        if (response.ok) {
          mostrarToast('Miembro reactivado correctamente', 'success');
          cargarMiembros(filtroTextoActual, filtroTipoActual);
        } else {
          mostrarToast('Error al reactivar: ' + (data.error || data.mensaje), 'danger');
        }
      } catch (err) {
        console.error('Error reactivando miembro:', err);
        mostrarToast('No se pudo reactivar el miembro', 'danger');
      }
    }
    
    // Enviar notificación manual
    if (e.target.classList.contains('btn-notify')) {
      const id = e.target.dataset.id;
      // Guardar en window para usar al enviar
      window.notificationTargetId = id;
      document.getElementById('notiAsunto').value = '';
      document.getElementById('notiMensaje').value = '';
      const modal = new bootstrap.Modal(document.getElementById('modalEnviarNotificacion'));
      modal.show();
    }
  });

  // Mostrar mensajes tipo toast
  function mostrarToast(mensaje, tipo = "success") {
    const toast = document.getElementById("toastMensaje");
    const texto = document.getElementById("toastTexto");
    toast.classList.remove("bg-success", "bg-danger", "bg-warning");
    toast.classList.add(`bg-${tipo}`);
    texto.textContent = mensaje;
    new bootstrap.Toast(toast).show();
  }

  // Modal de mensajes
  function mostrarModalMensaje(titulo, mensaje, tipo = "success") {
    const modal = new bootstrap.Modal(document.getElementById("modalMensaje"));
    const header = document.getElementById("modalMensajeHeader");
    const tituloElem = document.getElementById("modalMensajeTitulo");
    const body = document.getElementById("modalMensajeBody");

    header.classList.remove("bg-success", "bg-danger", "bg-warning", "text-white");
    if (tipo === "success") header.classList.add("bg-success", "text-white");
    if (tipo === "error") header.classList.add("bg-danger", "text-white");
    if (tipo === "warning") header.classList.add("bg-warning", "text-dark");

    tituloElem.textContent = titulo;
    body.textContent = mensaje;

    modal.show();
  }







async function verDetalleMiembro(idMiembro) {
  try {
    // Cargar información del miembro
    const responseMiembro = await fetch(`${BASE_URL}/api/miembros/${idMiembro}`, { credentials: 'include' });
    const miembro = await responseMiembro.json();

    // Rellenar información personal (mapeo a nombres reales de columnas)
    document.getElementById('detalleMiembroId').textContent = miembro.id ?? '-';
    document.getElementById('detalleMiembroNombres').textContent = miembro.nombres ?? '-';
    document.getElementById('detalleMiembroApellidos').textContent = miembro.apellidos ?? '-';
    document.getElementById('detalleMiembroEmail').textContent = miembro.email ?? '-';
    document.getElementById('detalleMiembroCelular').textContent = miembro.celular ?? '-';
    document.getElementById('detalleMiembroDireccion').textContent = miembro.direccion ?? '-';
    document.getElementById('detalleMiembroFechaInscripcion').textContent = miembro.fecha_inscripcion
      ? new Date(miembro.fecha_inscripcion).toLocaleDateString('es-CO')
      : '-';


    // Rellenar historial de préstamos
    const historialEl = document.getElementById('detalleHistorialPrestamos');
    const prestamos = Array.isArray(miembro.prestamos) ? miembro.prestamos : [];
    if (prestamos.length === 0) {
      historialEl.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay préstamos registrados</td></tr>';
    } else {
      historialEl.innerHTML = prestamos.map(p => {
        const fechaPrestamo = p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleDateString('es-CO') : '-';
        const fechaDevolucion = p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleDateString('es-CO') : 'Pendiente';
        const titulo = p.titulo_libro || '-';
        const estado = p.estado || '-';
        return `<tr>
          <td>${p.id_prestamo}</td>
          <td>${titulo}</td>
          <td>${fechaPrestamo}</td>
          <td>${fechaDevolucion}</td>
          <td>${estado}</td>
        </tr>`;
      }).join('');
    }

    // Rellenar beneficios (si vienen)
    const beneficiosEl = document.getElementById('detalleBeneficios');
    const beneficios = Array.isArray(miembro.beneficios) ? miembro.beneficios : [];
    if (beneficios.length === 0) {
      beneficiosEl.innerHTML = '<p class="text-muted mb-0">No hay beneficios asignados</p>';
    } else {
      beneficiosEl.innerHTML = '<ul class="mb-0">' + beneficios.map(b => `<li><strong>${b.nombre || b.titulo || 'Beneficio'}</strong> - ${b.descripcion || ''}</li>`).join('') + '</ul>';
    }

    // Rellenar multas (si existen)
    const multasEl = document.getElementById('detalleMultas');
    const multas = Array.isArray(miembro.multas) ? miembro.multas : [];
    if (multas.length === 0) {
      multasEl.innerHTML = '<p class="text-muted mb-0">No hay multas registradas</p>';
    } else {
      multasEl.innerHTML = '<div class="list-group">' + multas.map(m => `
        <div class="list-group-item d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold">${m.titulo_libro || 'Préstamo ' + m.id_prestamo}</div>
            <div class="small text-muted">Días de retraso: ${m.dias_retraso} (días a cobrar: ${m.dias_cobrar})</div>
          </div>
          <div class="text-danger fw-bold">$${Number(m.monto).toFixed(2)}</div>
        </div>`).join('') + '</div>';
    }

    // Guardar datos del miembro para las descargas
    window.miembroActual = { miembro, prestamos, beneficios, multas };

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleMiembro'));
    modal.show();

  } catch (error) {
    console.error('Error al cargar detalle del miembro:', error);
    mostrarToast('Error al cargar la información del miembro', 'error');
  }
}

function descargarCertificadoAfiliacion() {
  if (!window.miembroActual) return;
  
  const { miembro } = window.miembroActual;
  
  // Crear contenido HTML para el certificado
  const contenido = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificado de Afiliación</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #003049; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #003049; }
        .content { margin: 30px 0; line-height: 1.8; }
        .info { margin: 10px 0; }
        .label { font-weight: bold; color: #023e8a; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">CERTIFICADO DE AFILIACIÓN</div>
        <p>Sistema de Gestión de Biblioteca</p>
      </div>
      <div class="content">
        <p>Se certifica que:</p>
        <div class="info"><span class="label">Miembro:</span> ${miembro.nombres} ${miembro.apellidos}</div>
        <div class="info"><span class="label">Identificación:</span> ${miembro.id}</div>
        <div class="info"><span class="label">Email:</span> ${miembro.email}</div>
        <div class="info"><span class="label">Celular:</span> ${miembro.celular}</div>
        <div class="info"><span class="label">Dirección:</span> ${miembro.direccion}</div>
        <div class="info"><span class="label">Fecha de Inscripción:</span> ${miembro.fecha_inscripcion ? new Date(miembro.fecha_inscripcion).toLocaleDateString('es-CO') : '-'}</div>
        
        <p style="margin-top: 30px;">
          Es miembro activo de nuestra biblioteca desde la fecha indicada, 
          con todos los derechos y beneficios que esto conlleva.
        </p>
      </div>
      <div class="footer">
        <p>Documento generado el ${new Date().toLocaleDateString('es-ES')}</p>
      </div>
    </body>
    </html>
  `;
  
  // Crear y descargar el archivo
  const blob = new Blob([contenido], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Certificado_Afiliacion_${miembro.id || 'miembro'}.html`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  mostrarToast('Certificado descargado exitosamente', 'success');
}

// Descarga simple del historial de préstamos (si se llega a cargar en el futuro)
function descargarHistorialPrestamos() {
  if (!window.miembroActual || !Array.isArray(window.miembroActual.prestamos) || window.miembroActual.prestamos.length === 0) {
    mostrarToast('No hay historial de préstamos para descargar', 'warning');
    return;
  }

  const filas = window.miembroActual.prestamos.map(p => `
    <tr>
      <td>${p.id_prestamo}</td>
      <td>${p.titulo_libro || '-'}</td>
      <td>${p.fecha_prestamo || '-'}</td>
      <td>${p.fecha_devolucion || 'Pendiente'}</td>
      <td>${p.estado || '-'}</td>
    </tr>
  `).join('');

  const contenido = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Historial de Préstamos</title>
    <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px} th{background:#f2f2f2}</style>
    </head><body>
    <h2>Historial de Préstamos</h2>
    <table>
      <thead><tr><th>ID</th><th>Libro</th><th>Fecha Préstamo</th><th>Fecha Devolución</th><th>Estado</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    </body></html>
  `;

  const blob = new Blob([contenido], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Historial_Prestamos.html';
  a.click();
  window.URL.revokeObjectURL(url);
  
  mostrarToast('Historial descargado', 'success');
}

  // Exponer funciones usadas por los botones inline del HTML
  window.descargarCertificadoAfiliacion = descargarCertificadoAfiliacion;
  window.descargarHistorialPrestamos = descargarHistorialPrestamos;














  // Inicializar
  cargarMiembros(filtroTextoActual, filtroTipoActual);

  // Manejo del formulario de envío de notificación
  const formEnviarNoti = document.getElementById('formEnviarNotificacion');
  if (formEnviarNoti) {
    formEnviarNoti.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const asunto = document.getElementById('notiAsunto').value.trim();
      const mensaje = document.getElementById('notiMensaje').value.trim();
      const via = document.getElementById('notiCanal') ? document.getElementById('notiCanal').value : 'both';
      const id = window.notificationTargetId;
      if (!id) return mostrarToast('No se seleccionó miembro', 'danger');
      try {
        console.log('Enviando notificación', { id, via, asunto, mensaje });
        const res = await fetch(`${BASE_URL}/api/miembros/${id}/notify`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asunto, mensaje, via })
        });
        const json = await res.json();
        if (res.ok) {
          if (json.resultados) {
            const requested = via === 'both' ? ['email', 'whatsapp'] : [via];
            const parts = [];
            let hasError = false;
            let allSent = true;

            const mapStatus = (channel, status) => {
              const m = {
                enviado: 'Enviado',
                error: 'Error',
                no_email: 'Sin email',
                no_celular: 'Sin celular',
                faltan_datos: 'Faltan datos',
                no_solicitado: 'No solicitado'
              };
              return m[status] || status;
            };

            for (const ch of ['email', 'whatsapp']) {
              if (json.resultados[ch] && json.resultados[ch] !== 'no_solicitado') {
                const s = json.resultados[ch];
                parts.push((ch === 'email' ? 'Email' : 'WhatsApp') + ': ' + mapStatus(ch, s));
                if (s === 'error') hasError = true;
                if (s !== 'enviado') allSent = false;
              }
            }

            const toastType = hasError ? 'danger' : (allSent ? 'success' : 'warning');
            mostrarToast('Notificación: ' + parts.join(' | '), toastType);
          } else {
            mostrarToast('Notificación enviada', 'success');
          }
          const modal = bootstrap.Modal.getInstance(document.getElementById('modalEnviarNotificacion'));
          modal.hide();
        } else {
          mostrarToast(json.error || 'Error al enviar notificación', 'danger');
        }
      } catch (err) {
        console.error('Error al enviar notificación:', err);
        mostrarToast('Error al enviar notificación', 'danger');
      }
    });
  }


  

});
