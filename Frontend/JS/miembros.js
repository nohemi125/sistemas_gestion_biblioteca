document.addEventListener("DOMContentLoaded", () => {
  // Base de la API para evitar problemas de puertos (p.ej. 8080 vs 3000)
  const BASE_URL = window.location.origin.includes('localhost')
    ? 'http://localhost:3000'
    : window.location.origin;

  const form = document.getElementById("formMiembro");
  const tablaMiembros = document.getElementById("tablaMiembros");
  const buscador = document.getElementById("buscadorMiembro");
  const filtroTipo = document.getElementById("filtroTipo");
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
    if (!/^\d{10}$/.test(nuevoMiembro.id)) {
      const el = document.getElementById("errorId");
      if (el) el.textContent = "El Id debe tener 10 dígitos.";
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
        cargarMiembros();
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

  // Cargar miembros desde la BD (acepta filtro opcional)
  async function cargarMiembros(filtro = "") {
    try {
      let url = `${BASE_URL}/api/miembros`;
      if (filtro && filtro.trim() !== "") {
        // Usar endpoint de búsqueda del backend
        url = `${BASE_URL}/api/miembros/buscar?filtro=${encodeURIComponent(filtro)}`;
      }
      const response = await fetch(url, { credentials: "include" });
      const miembros = await response.json();

      tablaMiembros.innerHTML = "";

      miembros.forEach(miembro => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${miembro.id}</td>
          <td>${miembro.nombres}</td>
          <td>${miembro.apellidos}</td>
          <td>${miembro.email}</td>
          <td>${miembro.direccion}</td>
          <td>${miembro.celular}</td>
          <td>${new Date(miembro.fecha_inscripcion).toLocaleDateString('es-CO')}</td>
          <td>
            <i class="bi bi-eye text-primary btn-ver" data-id="${miembro.id_miembro}" style="cursor:pointer; font-size:1.2rem;" title="Ver detalle"></i>
            <i class="bi bi-pencil-square text-warning btn-editar" data-id="${miembro.id_miembro}" style="cursor:pointer; font-size:1.2rem; margin-left:8px;" title="Editar"></i>
            <i class="bi bi-trash text-danger btn-eliminar" data-id="${miembro.id_miembro}" style="cursor:pointer; font-size:1.2rem; margin-left:8px;" title="Eliminar"></i>
          </td>
        `;
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

  // Manejo del buscador
  const handleBuscar = debounce(() => {
    const valor = buscador ? buscador.value.trim() : "";
    const tipo = filtroTipo ? filtroTipo.value : "";

    // Si hay un filtro por tipo (Activo/Inactivo) podrías combinarlo aquí.
    // Por ahora priorizamos la búsqueda por texto.
    if (valor === "") {
      cargarMiembros();
    } else {
      cargarMiembros(valor);
    }
  }, 300);

  if (buscador) buscador.addEventListener('input', handleBuscar);
  if (filtroTipo) filtroTipo.addEventListener('change', () => {
    // Reutilizamos cargarMiembros, podrías adaptar para enviar tipo al backend
    const valor = buscador ? buscador.value.trim() : "";
    if (valor) cargarMiembros(valor);
    else cargarMiembros();
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
      document.getElementById("fechaInscripcion").value = miembro.fecha_inscripcion;

      const modal = new bootstrap.Modal(document.getElementById("modalMiembro"));
      modal.show();
    }

    if (e.target.classList.contains("btn-eliminar")) {
      idAEliminar = e.target.dataset.id;
      const modalConfirmar = new bootstrap.Modal(document.getElementById("modalConfirmar"));
      modalConfirmar.show();

      const btnConfirmar = document.getElementById("btnConfirmarEliminar");
      btnConfirmar.onclick = async () => {
        try {
          const response = await fetch(`${BASE_URL}/api/miembros/${idAEliminar}`, {
            method: "DELETE",
            credentials: "include"
          });
          const data = await response.json();

          if (response.ok) {
            mostrarToast("Miembro eliminado correctamente", "success");
            cargarMiembros();
          } else {
            mostrarToast("Error al eliminar miembro: " + data.error, "danger");
          }
        } catch (error) {
          console.error("Error al eliminar miembro:", error);
          mostrarToast("No se pudo eliminar el miembro", "danger");
        }
        modalConfirmar.hide();
      };
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

    // Secciones aún no implementadas en backend: mostrar por defecto
    document.getElementById('detalleHistorialPrestamos').innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay préstamos registrados</td></tr>';
    document.getElementById('detalleBeneficios').innerHTML = '<p class="text-muted mb-0">No hay beneficios asignados</p>';
    document.getElementById('detalleMultas').innerHTML = '<p class="text-muted mb-0">No hay multas registradas</p>';

    // Guardar datos del miembro para las descargas
    window.miembroActual = { miembro, prestamos: [], beneficios: [], multas: [] };

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
  cargarMiembros();


  

});
