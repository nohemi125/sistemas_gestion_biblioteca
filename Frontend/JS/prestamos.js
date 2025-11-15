document.addEventListener("DOMContentLoaded", () => {
  const tablaPrestamos = document.getElementById("tablaPrestamos")
  const buscadorPrestamo = document.getElementById("buscadorPrestamo")
  const filtroEstado = document.getElementById("filtroEstado")
  const filtroPeriodo = document.getElementById("filtroPeriodo")
  const formNuevoPrestamo = document.getElementById("formNuevoPrestamo")
  
  // Elementos para autocompletado
  const inputMiembro = document.getElementById("miembroPrestamo")
  const listaMiembros = document.getElementById("listaMiembros")
  const inputLibro = document.getElementById("libroPrestamo")
  const listaLibros = document.getElementById("listaLibros")
  
  let miembroSeleccionado = null
  let libroSeleccionado = null
  let prestamoEditandoId = null
  const bootstrap = window.bootstrap // Declare the bootstrap variable
  let todosLosPrestamos = [] // Variable para guardar todos los préstamos sin filtrar

  // Cargar préstamos desde la BD
  async function cargarPrestamos(filtro = "") {
    try {
      let url = "/api/prestamos"
      if (filtro && filtro.trim() !== "") {
        url = `/api/prestamos/buscar?filtro=${encodeURIComponent(filtro)}`
      }

      const response = await fetch(url, { credentials: "include" })
      let prestamos = await response.json()

      // Guardar todos los préstamos para los contadores
      todosLosPrestamos = [...prestamos]

      // Aplicar filtro de estado si está seleccionado
      const estadoSeleccionado = filtroEstado ? filtroEstado.value : ""
      if (estadoSeleccionado && estadoSeleccionado !== "") {
        const fechaActual = new Date()
        
        prestamos = prestamos.filter((p) => {
          // Para devueltos, filtrar directamente
          if (estadoSeleccionado === "Devuelto") {
            return p.estado === "Devuelto"
          }
          
          // Para vencidos: estado Vencido O estado Activo con fecha pasada
          if (estadoSeleccionado === "Vencido") {
            if (p.estado === "Devuelto") return false
            if (p.estado === "Vencido") return true
            
            const fechaDevolucion = new Date(p.fecha_devolucion)
            const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))
            return diferenciaDias < 0
          }
          
          // Para activos: estado Activo Y fecha no pasada
          if (estadoSeleccionado === "Activo") {
            if (p.estado !== "Activo") return false
            
            const fechaDevolucion = new Date(p.fecha_devolucion)
            const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))
            return diferenciaDias >= 0
          }
          
          return true
        })
      }

      // Aplicar filtro de período (hoy, semana, mes) usando fecha_prestamo
      const periodoSeleccionado = filtroPeriodo ? filtroPeriodo.value : "todos"
      if (periodoSeleccionado && periodoSeleccionado !== "todos") {
        const hoy = new Date()
        // Normalizar sin tiempo
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

        prestamos = prestamos.filter(p => {
          const fechaPrestamo = new Date(p.fecha_prestamo)
          const fechaNorm = new Date(fechaPrestamo.getFullYear(), fechaPrestamo.getMonth(), fechaPrestamo.getDate())

          if (periodoSeleccionado === 'hoy') {
            return fechaNorm.getTime() === inicioHoy.getTime()
          }
          if (periodoSeleccionado === 'semana') { // últimos 7 días (incluye hoy)
            const hace7 = new Date(inicioHoy)
            hace7.setDate(hace7.getDate() - 6) // rango de 7 días: hoy y 6 atrás
            return fechaNorm >= hace7 && fechaNorm <= inicioHoy
          }
          if (periodoSeleccionado === 'mes') { // últimos 30 días (incluye hoy)
            const hace30 = new Date(inicioHoy)
            hace30.setDate(hace30.getDate() - 29)
            return fechaNorm >= hace30 && fechaNorm <= inicioHoy
          }
          // personalizado: aquí se podría implementar cuando existan campos de rango
          return true
        })
      }

      tablaPrestamos.innerHTML = ""

      if (prestamos.length === 0) {
        tablaPrestamos.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted py-4">
              <i class="bi bi-inbox fs-1"></i><br>
              No se encontraron préstamos
            </td>
          </tr>
        `
        return
      }

      prestamos.forEach((prestamo) => {
        const fila = document.createElement("tr")

        // Calcular días restantes y determinar estado
        const fechaDevolucion = new Date(prestamo.fecha_devolucion)
        const fechaActual = new Date()
        const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))

        let badgeEstado = ""
        let diasRestantes = ""
        let opcionesAcciones = ""

        // Determinar estado y badge
        if (prestamo.estado === "Devuelto") {
          badgeEstado = '<span class="badge-estado badge-devuelto">DEVUELTO</span>'
          diasRestantes = '<span class="dias-restantes dias-completo">Completado</span>'
          opcionesAcciones = `
            <button class="btn btn-sm btn-action" disabled>
              <i class="bi bi-check-all"></i>
            </button>
          `
        } else if (prestamo.estado === "Vencido" || diferenciaDias < 0) {
          badgeEstado = '<span class="badge-estado badge-vencido">VENCIDO</span>'
          diasRestantes = `<span class="dias-restantes dias-vencido">${Math.abs(diferenciaDias)} días (Vencido)</span>`
          opcionesAcciones = `
            <div class="dropdown">
              <button class="btn btn-sm btn-action dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item btn-editar-prestamo" href="#" data-id="${prestamo.id_prestamo}"><i class="bi bi-pencil me-2"></i>Editar</a></li>
                <li><a class="dropdown-item btn-devolucion" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}"><i class="bi bi-check-circle me-2"></i>Registrar Devolución</a></li>
                <li><a class="dropdown-item text-danger btn-multa" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-dias="${Math.abs(diferenciaDias)}"><i class="bi bi-currency-dollar me-2"></i>Enviar Multa</a></li>
              </ul>
            </div>
          `
        } else {
          badgeEstado = '<span class="badge-estado badge-activo">ACTIVO</span>'
          if (diferenciaDias <= 3) {
            diasRestantes = `<span class="dias-restantes dias-urgente">${diferenciaDias} días</span>`
          } else {
            diasRestantes = `<span class="dias-restantes dias-normal">${diferenciaDias} días</span>`
          }
          opcionesAcciones = `
            <div class="dropdown">
              <button class="btn btn-sm btn-action dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item btn-editar-prestamo" href="#" data-id="${prestamo.id_prestamo}"><i class="bi bi-pencil me-2"></i>Editar</a></li>
                <li><a class="dropdown-item btn-devolucion" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}"><i class="bi bi-check-circle me-2"></i>Registrar Devolución</a></li>
                <li><a class="dropdown-item btn-recordatorio" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}"><i class="bi bi-envelope me-2"></i>Enviar Recordatorio</a></li>
              </ul>
            </div>
          `
        }

        fila.innerHTML = `
          <td><strong>#P${String(prestamo.id_prestamo).padStart(3, "0")}</strong></td>
          <td>${prestamo.nombre_miembro}</td>
          <td>${prestamo.titulo_libro}</td>
          <td>${new Date(prestamo.fecha_prestamo).toLocaleDateString("es-CO")}</td>
          <td>${new Date(prestamo.fecha_devolucion).toLocaleDateString("es-CO")}</td>
          <td>${badgeEstado}</td>
          <td>${diasRestantes}</td>
          <td>${opcionesAcciones}</td>
        `

        tablaPrestamos.appendChild(fila)
      })

      // Actualizar contadores con TODOS los préstamos, no solo los filtrados
      actualizarContadores(todosLosPrestamos)
    } catch (error) {
      console.error("Error al cargar préstamos:", error)
      mostrarToast("Error al cargar préstamos", "danger")
    }
  }

  // Actualizar contadores de estadísticas
  function actualizarContadores(prestamos) {
    const fechaActual = new Date()
    
    // Contar vencidos: incluye estado "Vencido" y "Activo" con fecha de devolución pasada
    const vencidos = prestamos.filter((p) => {
      if (p.estado === "Devuelto") return false
      if (p.estado === "Vencido") return true
      
      // Si es "Activo", verificar si la fecha de devolución ya pasó
      const fechaDevolucion = new Date(p.fecha_devolucion)
      const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))
      return diferenciaDias < 0
    }).length
    
    // Contar activos: solo los que están en estado "Activo" y NO están vencidos
    const activos = prestamos.filter((p) => {
      if (p.estado !== "Activo") return false
      
      const fechaDevolucion = new Date(p.fecha_devolucion)
      const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))
      return diferenciaDias >= 0
    }).length
    
    const devueltos = prestamos.filter((p) => p.estado === "Devuelto").length

    document.getElementById("totalPrestados").textContent = activos
    document.getElementById("totalVencidos").textContent = vencidos
    document.getElementById("totalDevueltos").textContent = devueltos
  }

  // Debounce para búsqueda
  function debounce(fn, wait) {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn.apply(this, args), wait)
    }
  }

  // Manejo del buscador
  const handleBuscar = debounce(() => {
    const valor = buscadorPrestamo ? buscadorPrestamo.value.trim() : ""
    if (valor === "") {
      cargarPrestamos()
    } else {
      cargarPrestamos(valor)
    }
  }, 300)

  if (buscadorPrestamo) buscadorPrestamo.addEventListener("input", handleBuscar)

  //  Autocompletado de miembros
  if (inputMiembro) {
    inputMiembro.addEventListener("input", async () => {
      const nombre = inputMiembro.value.trim()
      
      if (nombre.length < 2) {
        listaMiembros.innerHTML = ""
        listaMiembros.style.display = "none"
        miembroSeleccionado = null
        return
      }

      try {
        const response = await fetch(`/api/miembros/buscar?nombre=${encodeURIComponent(nombre)}`, {
          credentials: "include"
        })
        const miembros = await response.json()
        
        listaMiembros.innerHTML = ""
        
        if (miembros.length === 0) {
          const li = document.createElement("li")
          li.className = "list-group-item text-danger"
          li.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>Miembro no encontrado o no registrado'
          listaMiembros.appendChild(li)
          listaMiembros.style.display = "block"
          miembroSeleccionado = null
          return
        }

        miembros.forEach((m) => {
          const li = document.createElement("li")
          li.className = "list-group-item list-group-item-action"
          li.style.cursor = "pointer"
          li.innerHTML = `
            <strong>${m.nombres} ${m.apellidos}</strong><br>
            <small class="text-muted">${m.correo || 'Sin correo'}</small>
          `
          li.addEventListener("click", () => {
            inputMiembro.value = `${m.nombres} ${m.apellidos}`
            miembroSeleccionado = m.id_miembro
            listaMiembros.innerHTML = ""
            listaMiembros.style.display = "none"
          })
          listaMiembros.appendChild(li)
        })
        
        listaMiembros.style.display = "block"
      } catch (error) {
        console.error("Error al buscar miembros:", error)
      }
    })
  }

  //  Autocompletado de libros
  if (inputLibro) {
    inputLibro.addEventListener("input", async () => {
      const titulo = inputLibro.value.trim()
      
      if (titulo.length < 2) {
        listaLibros.innerHTML = ""
        listaLibros.style.display = "none"
        libroSeleccionado = null
        return
      }

      try {
        const response = await fetch(`/api/libros/buscar?titulo=${encodeURIComponent(titulo)}`, {
          credentials: "include"
        })
        const libros = await response.json()
        
        listaLibros.innerHTML = ""
        
        if (libros.length === 0) {
          const li = document.createElement("li")
          li.className = "list-group-item text-danger"
          li.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>Libro no encontrado o no registrado'
          listaLibros.appendChild(li)
          listaLibros.style.display = "block"
          libroSeleccionado = null
          return
        }

        libros.forEach((l) => {
          const li = document.createElement("li")
          li.className = "list-group-item list-group-item-action"
          li.style.cursor = "pointer"
          li.innerHTML = `
            <strong>${l.titulo}</strong><br>
            <small class="text-muted">${l.autor || 'Sin autor'} - ${l.disponibles || 0} disponibles</small>
          `
          li.addEventListener("click", () => {
            inputLibro.value = l.titulo
            libroSeleccionado = l.id_libro || l.id
            listaLibros.innerHTML = ""
            listaLibros.style.display = "none"
          })
          listaLibros.appendChild(li)
        })
        
        listaLibros.style.display = "block"
      } catch (error) {
        console.error("Error al buscar libros:", error)
      }
    })
  }

  // Cerrar listas al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#miembroPrestamo") && !e.target.closest("#listaMiembros")) {
      listaMiembros.innerHTML = ""
      listaMiembros.style.display = "none"
    }
    if (!e.target.closest("#libroPrestamo") && !e.target.closest("#listaLibros")) {
      listaLibros.innerHTML = ""
      listaLibros.style.display = "none"
    }
  })

  // Filtros de estado
  if (filtroEstado) {
    filtroEstado.addEventListener("change", () => {
      cargarPrestamos()
    })
  }

  // Filtro de período (hoy / semana / mes)
  if (filtroPeriodo) {
    filtroPeriodo.addEventListener("change", () => {
      // Si más adelante se agrega opción "personalizado" mostrar el rango
      if (filtroPeriodo.value === 'personalizado') {
        const rango = document.getElementById('rangoPersonalizado')
        if (rango) rango.style.display = 'block'
      } else {
        const rango = document.getElementById('rangoPersonalizado')
        if (rango) rango.style.display = 'none'
      }
      cargarPrestamos(buscadorPrestamo ? buscadorPrestamo.value.trim() : "")
    })
  }

  // Click en las acciones de la tabla
  tablaPrestamos.addEventListener("click", async (e) => {
    e.preventDefault()

    // Editar préstamo
    if (e.target.closest(".btn-editar-prestamo")) {
      const id = e.target.closest(".btn-editar-prestamo").dataset.id
      prestamoEditandoId = id

      try {
        const response = await fetch(`/api/prestamos/${id}`, { credentials: "include" })
        const prestamo = await response.json()

        // Cargar datos en el modal de edición
        document.querySelector("#modalEditar input[disabled]").value = `#P${String(id).padStart(3, "0")}`
        document.querySelectorAll("#modalEditar input[disabled]")[1].value = prestamo.nombre_miembro
        document.querySelectorAll("#modalEditar input[disabled]")[2].value = prestamo.titulo_libro
        document.getElementById("nuevaFechaDevolucion").value = prestamo.fecha_devolucion

        const modal = new bootstrap.Modal(document.getElementById("modalEditar"))
        modal.show()
      } catch (error) {
        console.error("Error al cargar préstamo:", error)
        mostrarToast("Error al cargar datos del préstamo", "danger")
      }
    }

    // Registrar devolución
    if (e.target.closest(".btn-devolucion")) {
      const btn = e.target.closest(".btn-devolucion")
      const id = btn.dataset.id
      const miembro = btn.dataset.miembro
      const libro = btn.dataset.libro

      document.querySelector("#modalDevolucion .alert-info").innerHTML = `
        <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")}<br>
        <strong>Miembro:</strong> ${miembro}<br>
        <strong>Libro:</strong> ${libro}
      `

      // Establecer fecha actual como fecha de devolución
      const fechaHoy = new Date().toISOString().split('T')[0]
      document.getElementById("fechaDevolucionReal").value = fechaHoy

      document.getElementById("formDevolucion").dataset.prestamoId = id

      const modal = new bootstrap.Modal(document.getElementById("modalDevolucion"))
      modal.show()
    }

    // Enviar recordatorio
    if (e.target.closest(".btn-recordatorio")) {
      const btn = e.target.closest(".btn-recordatorio")
      const id = btn.dataset.id
      const miembro = btn.dataset.miembro
      const libro = btn.dataset.libro

      document.querySelector("#modalRecordatorio .alert-secondary").innerHTML = `
        <strong>Para:</strong> ${miembro}<br>
        <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")} - ${libro}
      `

      // Guardar ID del préstamo en el formulario
      document.getElementById("formRecordatorio").dataset.prestamoId = id

      const modal = new bootstrap.Modal(document.getElementById("modalRecordatorio"))
      modal.show()
    }

    // Enviar multa
    if (e.target.closest(".btn-multa")) {
      const btn = e.target.closest(".btn-multa")
      const id = btn.dataset.id
      const miembro = btn.dataset.miembro
      const libro = btn.dataset.libro
      const dias = btn.dataset.dias

      document.querySelector("#modalMulta .alert-danger").innerHTML = `
        <strong>Para:</strong> ${miembro}<br>
        <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")} - ${libro}<br>
        <strong>Días de retraso:</strong> ${dias} días
      `

      document.getElementById("montoMulta").value = (Number.parseFloat(dias) * 1.0).toFixed(2)

      // Guardar ID del préstamo en el formulario
      document.getElementById("formMulta").dataset.prestamoId = id

      const modal = new bootstrap.Modal(document.getElementById("modalMulta"))
      modal.show()
    }
  })

  // Formulario nuevo préstamo
  if (formNuevoPrestamo) {
    formNuevoPrestamo.addEventListener("submit", async (e) => {
      e.preventDefault()

      // Validar que se haya seleccionado un miembro de la lista
      if (!miembroSeleccionado) {
        mostrarToast("Debes seleccionar un miembro de la lista de sugerencias", "warning")
        return
      }

      // Validar que se haya seleccionado un libro de la lista
      if (!libroSeleccionado) {
        mostrarToast("Debes seleccionar un libro de la lista de sugerencias", "warning")
        return
      }

      const nuevoPrestamo = {
        id_miembro: miembroSeleccionado,
        id_libro: libroSeleccionado,
        fecha_prestamo: document.getElementById("fechaPrestamo").value,
        fecha_devolucion: document.getElementById("fechaDevolucion").value,
      }

      try {
        const response = await fetch("/api/prestamos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(nuevoPrestamo),
        })

        const data = await response.json()

        if (response.ok) {
          mostrarToast("Préstamo registrado correctamente", "success")
          
          // Resetear formulario y variables
          formNuevoPrestamo.reset()
          miembroSeleccionado = null
          libroSeleccionado = null
          listaMiembros.innerHTML = ""
          listaLibros.innerHTML = ""
          
          cargarPrestamos()
          const modal = bootstrap.Modal.getInstance(document.getElementById("modalNuevoPrestamo"))
          modal.hide()
        } else {
          mostrarToast("Error al registrar préstamo: " + data.error, "danger")
        }
      } catch (error) {
        console.error("Error:", error)
        mostrarToast("No se pudo registrar el préstamo", "danger")
      }
    })
  }

  // Formulario de devolución
  const formDevolucion = document.getElementById("formDevolucion")
  if (formDevolucion) {
    formDevolucion.addEventListener("submit", async (e) => {
      e.preventDefault()

      const prestamoId = formDevolucion.dataset.prestamoId

      if (!prestamoId) {
        mostrarToast("Error: No se ha seleccionado un préstamo", "danger")
        return
      }

      const fechaDevolucionReal = document.getElementById("fechaDevolucionReal").value

      const datosDevolucion = {
        estado: "Devuelto",
        fecha_devolucion: fechaDevolucionReal, // Actualizar la fecha de devolución a la fecha real
        fecha_devolucion_real: fechaDevolucionReal,
        estado_libro: document.getElementById("estadoLibro").value,
        notas: document.getElementById("notasDevolucion").value
      }

      try {
        const response = await fetch(`/api/prestamos/${prestamoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(datosDevolucion),
        })

        const data = await response.json()

        if (response.ok) {
          mostrarToast("Devolución registrada correctamente", "success")
          
          // Resetear formulario
          formDevolucion.reset()
          
          // Cerrar modal
          const modal = bootstrap.Modal.getInstance(document.getElementById("modalDevolucion"))
          modal.hide()
          
          // Recargar préstamos
          cargarPrestamos()
        } else {
          mostrarToast("Error al registrar devolución: " + (data.error || data.mensaje), "danger")
        }
      } catch (error) {
        console.error("Error:", error)
        mostrarToast("No se pudo registrar la devolución", "danger")
      }
    })
  }

  // Formulario de recordatorio
  const formRecordatorio = document.getElementById("formRecordatorio")
  if (formRecordatorio) {
    formRecordatorio.addEventListener("submit", async (e) => {
      e.preventDefault()

      const prestamoId = formRecordatorio.dataset.prestamoId

      if (!prestamoId) {
        mostrarToast("Error: No se ha seleccionado un préstamo", "danger")
        return
      }

      try {
        const response = await fetch("/api/emails/recordatorio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id_prestamo: prestamoId }),
        })

        const data = await response.json()

        if (response.ok) {
          mostrarToast(`Recordatorio enviado a ${data.destinatario}`, "success")
          
          // Cerrar modal
          const modal = bootstrap.Modal.getInstance(document.getElementById("modalRecordatorio"))
          modal.hide()
        } else {
          mostrarToast("Error al enviar recordatorio: " + (data.error || data.mensaje), "danger")
        }
      } catch (error) {
        console.error("Error:", error)
        mostrarToast("No se pudo enviar el recordatorio", "danger")
      }
    })
  }

  // Formulario de multa
  const formMulta = document.getElementById("formMulta")
  if (formMulta) {
    formMulta.addEventListener("submit", async (e) => {
      e.preventDefault()

      const prestamoId = formMulta.dataset.prestamoId
      const montoMulta = document.getElementById("montoMulta").value

      if (!prestamoId) {
        mostrarToast("Error: No se ha seleccionado un préstamo", "danger")
        return
      }

      if (!montoMulta || parseFloat(montoMulta) <= 0) {
        mostrarToast("El monto de la multa debe ser mayor a 0", "warning")
        return
      }

      try {
        const response = await fetch("/api/emails/multa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            id_prestamo: prestamoId,
            monto_multa: parseFloat(montoMulta)
          }),
        })

        const data = await response.json()

        if (response.ok) {
          mostrarToast(`Multa de $${data.monto.toFixed(2)} enviada a ${data.destinatario}`, "success")
          
          // Cerrar modal
          const modal = bootstrap.Modal.getInstance(document.getElementById("modalMulta"))
          modal.hide()
        } else {
          mostrarToast("Error al enviar multa: " + (data.error || data.mensaje), "danger")
        }
      } catch (error) {
        console.error("Error:", error)
        mostrarToast("No se pudo enviar la notificación de multa", "danger")
      }
    })
  }

  // Mostrar toast
  function mostrarToast(mensaje, tipo = "success") {
    const toast = document.getElementById("toastMensaje")
    if (!toast) return

    const texto = document.getElementById("toastTexto")
    toast.classList.remove("bg-success", "bg-danger", "bg-warning")
    toast.classList.add(`bg-${tipo}`)
    texto.textContent = mensaje
    new bootstrap.Toast(toast).show()
  }

  // Inicializar
  cargarPrestamos()






  
})
