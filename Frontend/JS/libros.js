

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formLibro");
  const tablaLibros = document.getElementById("tablaLibros");
  const imagenInput = document.getElementById('imagen');
  const imagenPreviewContainer = document.getElementById('imagenPreviewContainer');
  const imagenPreview = document.getElementById('imagenPreview');
  const modalImagenImg = document.getElementById('modalImagenImg');
  let libroEditandoId = null;
  let idAEliminar = null;

  const bs = window.bootstrap;

  // Envío del formulario (Agregar o Editar)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Obtener los valores del formulario
    const nuevoLibro = {
      titulo: document.getElementById("titulo").value,
      autor: document.getElementById("autor").value,
      isbn: document.getElementById("isbn").value,
      imagen: document.getElementById("imagen").value,
      categoria: document.getElementById("categoria").value,
      cantidad: document.getElementById("cantidad").value,
      estado: document.getElementById("estado").value
    };

          // Obtener valores
          const titulo = document.getElementById("titulo").value.trim();
          const autor = document.getElementById("autor").value.trim();
          const isbn = document.getElementById("isbn").value.trim();

          // Limpiar mensajes
          document.getElementById("errorTitulo").textContent = "";
          document.getElementById("errorAutor").textContent = "";
          document.getElementById("errorIsbn").textContent = "";

        let valido = true;

       // Validar título
        if (!titulo || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,:;!?'\-]+$/.test(titulo)) {
            document.getElementById("errorTitulo").textContent =
              "Título inválido. Solo se permiten letras, números y símbolos comunes (, . : ; ! ? - ').";
            valido = false;
        }


        // Validar autor
        if (!autor || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(autor)) {
          document.getElementById("errorAutor").textContent = "Autor inválido. Solo letras y espacios.";
          valido = false;
        }

        // Validar ISBN
        if (!/^\d{13}$/.test(isbn)) {
          document.getElementById("errorIsbn").textContent = "El ISBN debe tener exactamente 10 números.";
          valido = false;
        }

        // // Si algo no es válido, no enviar
        if (!valido) return;





    try {
      let url = "http://localhost:3000/api/libros";
      let method = "POST";

      if (libroEditandoId) {
        url += `/${libroEditandoId}`;
        method = "PUT";
      }

      // Enviar al backend
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // enviar cookie de sesión
        body: JSON.stringify(nuevoLibro)
      });

      const data = await response.json();

 
    if (response.ok) {
  // Usar el mensaje que viene del servidor
  const mensaje = data.mensaje || (libroEditandoId ? "Libro editado correctamente" : "Libro agregado correctamente");
  
  mostrarModalMensaje(
    "Éxito",
    mensaje,
    "success"
  );
  form.reset();
  libroEditandoId = null; 
  cargarLibros();
  const modalLibro = bootstrap.Modal.getInstance(document.getElementById("modalLibro"));
  modalLibro.hide();
} else {
  mostrarModalMensaje("Error", "Ocurrió un error: " + data.error, "error");
}
    } catch (error) {
      console.error("Error:", error);
      mostrarModalMensaje("Error", "No se pudo procesar la solicitud", "error");
    }
    

  });

  // Función para obtener libros de la BD
  async function cargarLibros() {
    try {
  const response = await fetch("/api/libros", { credentials: 'include' });
      const libros = await response.json();

      // Limpiar tabla
      tablaLibros.innerHTML = "";

      libros.forEach(libro => {
        const fila = document.createElement("tr");
      fila.innerHTML = `
  <td>${libro.titulo}</td>
  <td>${libro.autor}</td>
  <td>${libro.isbn || ""}</td>
  <td>
    ${libro.imagen
      ? `<img src="${libro.imagen}" width="50" class="libro-thumb" data-src="${libro.imagen}" style="cursor:pointer;" alt="Imagen libro">`
      : `<span class="text-muted">Sin imagen</span>`}
  </td>
  <td>${libro.categoria}</td>
  <td>${libro.cantidad}</td>
  <td>${libro.estado}</td>
  <td>
    <i class="bi bi-pencil-square text-warning btn-editar" data-id="${libro.id}" style="cursor:pointer; font-size: 1.2rem;"></i>
    <i class="bi bi-trash text-danger btn-eliminar" data-id="${libro.id}" style="cursor:pointer; font-size: 1.2rem; margin-left: 8px;"></i>
  </td>
`;

        tablaLibros.appendChild(fila);
      });
    } catch (error) {
      console.error("Error al cargar libros:", error);
    }
  }

    // Manejar preview de la URL de imagen en el formulario (opcional)
    function actualizarPreviewImagen(url) {
      const errEl = document.getElementById('errorImagen');
      if (!url) {
        if (imagenPreviewContainer) imagenPreviewContainer.style.display = 'none';
        if (imagenPreview) imagenPreview.src = '';
        if (errEl) errEl.textContent = '';
        return;
      }

      // Probar carga de la imagen antes de mostrar
      const img = new Image();
      img.onload = () => {
        if (imagenPreview) imagenPreview.src = url;
        if (imagenPreviewContainer) imagenPreviewContainer.style.display = 'block';
        if (errEl) errEl.textContent = '';
      };
      img.onerror = () => {
        if (imagenPreviewContainer) imagenPreviewContainer.style.display = 'none';
        if (imagenPreview) imagenPreview.src = '';
        if (errEl) errEl.textContent = 'No se pudo cargar la imagen. Verifica la URL.';
      };
      img.src = url;
    }

    if (imagenInput) {
      imagenInput.addEventListener('input', () => {
        const url = imagenInput.value.trim();
        actualizarPreviewImagen(url);
      });
    }

    // Abrir modal con imagen ampliada al hacer clic en miniatura
    tablaLibros.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains('libro-thumb')) {
        const src = target.dataset.src || target.src;
        if (modalImagenImg) modalImagenImg.src = src;
        if (bs) {
          try {
            const m = new bs.Modal(document.getElementById('modalImagenView'));
            m.show();
          } catch (err) {
            console.warn('No se pudo abrir modal de imagen:', err);
          }
        }
      }
    });

  // Clicks en los botones de la tabla
  tablaLibros.addEventListener("click", async (e) => {
    // Si se hizo clic en "Editar"
    if (e.target.classList.contains("btn-editar")) {
      const id = e.target.dataset.id;
      libroEditandoId = id;

      // Obtener datos del libro desde el backend
  const response = await fetch(`/api/libros/${id}`, { credentials: 'include' });
      const libro = await response.json();

      // Llenar los inputs del modal
      document.getElementById("titulo").value = libro.titulo;
      document.getElementById("autor").value = libro.autor;
      document.getElementById("isbn").value = libro.isbn;
      document.getElementById("imagen").value = libro.imagen;
      // Mostrar preview si hay imagen
      actualizarPreviewImagen(libro.imagen);
      document.getElementById("categoria").value = libro.categoria;
      document.getElementById("cantidad").value = libro.cantidad;
      document.getElementById("estado").value = libro.estado;

      // Abrir modal
      const modal = new bootstrap.Modal(document.getElementById("modalLibro"));
      modal.show();
    }

    // Eliminar libro (mostrar modal)
    if (e.target.classList.contains("btn-eliminar")) {
      idAEliminar = e.target.dataset.id;
      const modalConfirmar = new bootstrap.Modal(document.getElementById("modalConfirmar"));
      modalConfirmar.show();

      const btnConfirmar = document.getElementById("btnConfirmarEliminar");
      btnConfirmar.onclick = async () => {
        try {
          const response = await fetch(`/api/libros/${idAEliminar}`, {
            method: "DELETE",
            credentials: 'include'
          });
          const data = await response.json();

          if (response.ok) {
            mostrarToast("Libro eliminado correctamente", "success");
            cargarLibros();
          } else {
            mostrarToast("Error al eliminar libro: " + data.error, "danger");
          }
        } catch (error) {
          console.error("Error al eliminar libro:", error);
          mostrarToast("No se pudo eliminar el libro", "danger");
        }
        modalConfirmar.hide();
      };
    }
  });



   // Función para mostrar notificaciones tipo Toast
  function mostrarToast(mensaje, tipo = "success") {
    const toast = document.getElementById("toastMensaje");
    const texto = document.getElementById("toastTexto");

    toast.classList.remove("bg-success", "bg-danger", "bg-warning");
    toast.classList.add(`bg-${tipo}`);
    texto.textContent = mensaje;

    const toastBootstrap = new bootstrap.Toast(toast);
    toastBootstrap.show();
  }



  function mostrarModalMensaje(titulo, mensaje, tipo = "success") {
  const modal = new bootstrap.Modal(document.getElementById("modalMensaje"));
  const header = document.getElementById("modalMensajeHeader");
  const tituloElem = document.getElementById("modalMensajeTitulo");
  const body = document.getElementById("modalMensajeBody");

  // Cambiar estilos según tipo
  header.classList.remove("bg-success", "bg-danger", "bg-warning", "text-white");
  if (tipo === "success") header.classList.add("bg-success", "text-white");
  if (tipo === "error") header.classList.add("bg-danger", "text-white");
  if (tipo === "warning") header.classList.add("bg-warning", "text-dark");

  tituloElem.textContent = titulo;
  body.textContent = mensaje;

  modal.show();
}


  // Cargar libros al abrir la página
  cargarLibros();


  //  BUSCADOR Y FILTRO

  const buscador = document.getElementById("buscador");
  const filtroCategoria = document.getElementById("filtroCategoria");

  async function buscarLibros() {
    try {
      const termino = buscador.value.trim();
      const categoria = filtroCategoria.value;
      let url = "/api/libros/buscar?";

      if (termino) url += `termino=${encodeURIComponent(termino)}&`;
      if (categoria) url += `categoria=${encodeURIComponent(categoria)}`;

      const response = await fetch(url, { credentials: 'include' });
      const libros = await response.json();

      mostrarLibrosEnTabla(libros);
    } catch (error) {
      console.error("Error al buscar libros:", error);
    }
  }

  // Reutilizamos tu código de cargarLibros, pero en una función separada
  function mostrarLibrosEnTabla(libros) {
    tablaLibros.innerHTML = "";

    if (libros.length === 0) {
      tablaLibros.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">No se encontraron libros</td>
        </tr>`;
      return;
    }

    libros.forEach(libro => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
  <td>${libro.titulo}</td>
  <td>${libro.autor}</td>
  <td>${libro.isbn || ""}</td>
  <td>
      ${libro.imagen
        ? `<img src="${libro.imagen}" width="50" class="libro-thumb" data-src="${libro.imagen}" style="cursor:pointer;" alt="Imagen libro">`
        : `<span class="text-muted">Sin imagen</span>`}
  </td>
  <td>${libro.categoria}</td>
  <td>${libro.cantidad}</td>
  <td>${libro.estado}</td>
  <td>
    <i class="bi bi-pencil-square text-warning btn-editar" data-id="${libro.id}" style="cursor:pointer; font-size: 1.2rem;"></i>
    <i class="bi bi-trash text-danger btn-eliminar" data-id="${libro.id}" style="cursor:pointer; font-size: 1.2rem; margin-left: 8px;"></i>
  </td>
`;

      tablaLibros.appendChild(fila);
    });
  }

  // Eventos de búsqueda y filtro
  buscador.addEventListener("input", buscarLibros);
  filtroCategoria.addEventListener("change", buscarLibros);

});
