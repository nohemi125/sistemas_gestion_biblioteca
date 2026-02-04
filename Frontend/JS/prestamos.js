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
  let correoSeleccionado = null
  let libroSeleccionado = null
  let libroCantidadDisponible = null
  let prestamoEditandoId = null
  const bootstrap = window.bootstrap 
  let todosLosPrestamos = [] // Variable para guardar todos los préstamos sin filtrar
  const libroCantidadEl = document.getElementById('libroCantidadDisponible')

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

      // Aplicar filtro de periodo (hoy, semana, mes, mes-especifico) usando fecha_prestamo
      const periodoSeleccionado = filtroPeriodo ? filtroPeriodo.value : "todos"
      if (periodoSeleccionado && periodoSeleccionado !== "todos") {
        const hoy = new Date()
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

        if (periodoSeleccionado === 'hoy') {
          prestamos = prestamos.filter(p => {
            const fechaPrestamo = new Date(p.fecha_prestamo)
            const fechaNorm = new Date(fechaPrestamo.getFullYear(), fechaPrestamo.getMonth(), fechaPrestamo.getDate())
            return fechaNorm.getTime() === inicioHoy.getTime()
          })
        } else if (periodoSeleccionado === 'semana') {
          const hace7 = new Date(inicioHoy)
          hace7.setDate(hace7.getDate() - 6)
          prestamos = prestamos.filter(p => {
            const fechaPrestamo = new Date(p.fecha_prestamo)
            const fechaNorm = new Date(fechaPrestamo.getFullYear(), fechaPrestamo.getMonth(), fechaPrestamo.getDate())
            return fechaNorm >= hace7 && fechaNorm <= inicioHoy
          })
        } else if (periodoSeleccionado === 'mes') {
          const hace30 = new Date(inicioHoy)
          hace30.setDate(hace30.getDate() - 29)
          prestamos = prestamos.filter(p => {
            const fechaPrestamo = new Date(p.fecha_prestamo)
            const fechaNorm = new Date(fechaPrestamo.getFullYear(), fechaPrestamo.getMonth(), fechaPrestamo.getDate())
            return fechaNorm >= hace30 && fechaNorm <= inicioHoy
          })
        } else if (periodoSeleccionado === 'personalizado') {
          const fechaDesdeInput = document.getElementById('fechaDesde');
          const fechaHastaInput = document.getElementById('fechaHasta');
          if (fechaDesdeInput && fechaHastaInput && fechaDesdeInput.value && fechaHastaInput.value) {
            const desde = new Date(fechaDesdeInput.value);
            const hasta = new Date(fechaHastaInput.value);
            prestamos = prestamos.filter(p => {
              const fechaPrestamo = new Date(p.fecha_prestamo);
              return fechaPrestamo >= desde && fechaPrestamo <= hasta;
            });
          }
        }
      }
  // Mostrar/ocultar el rango personalizado según el filtro seleccionado
  if (filtroPeriodo) {
    filtroPeriodo.addEventListener('change', () => {
      const rangoContainer = document.getElementById('rangoPersonalizado');
      if (filtroPeriodo.value === 'personalizado') {
        if (rangoContainer) rangoContainer.style.display = '';
      } else {
        if (rangoContainer) rangoContainer.style.display = 'none';
      }
      cargarPrestamos(buscadorPrestamo ? buscadorPrestamo.value.trim() : "");
    });
  }
  // Actualizar al cambiar fechas del rango
  const fechaDesdeInput = document.getElementById('fechaDesde');
  const fechaHastaInput = document.getElementById('fechaHasta');
  if (fechaDesdeInput) fechaDesdeInput.addEventListener('change', () => {
    if (filtroPeriodo.value === 'personalizado') cargarPrestamos(buscadorPrestamo ? buscadorPrestamo.value.trim() : "");
  });
  if (fechaHastaInput) fechaHastaInput.addEventListener('change', () => {
    if (filtroPeriodo.value === 'personalizado') cargarPrestamos(buscadorPrestamo ? buscadorPrestamo.value.trim() : "");
  });

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
                <li><a class="dropdown-item text-danger btn-multa" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-dias="${Math.abs(diferenciaDias)}" data-fecha="${prestamo.fecha_prestamo}"><i class="bi bi-currency-dollar me-2"></i>Enviar Multa</a></li>
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
                <li><a class="dropdown-item btn-recordatorio" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-fecha="${prestamo.fecha_prestamo}"><i class="bi bi-envelope me-2"></i>Enviar Recordatorio</a></li>
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

  // Manejo del buscador (incluye búsqueda por ID)
  const handleBuscar = debounce(() => {
    const valor = buscadorPrestamo ? buscadorPrestamo.value.trim() : ""
    if (valor === "") {
      cargarPrestamos()
      return
    }

    // Buscar por ID si el valor es tipo #P001, P001, 001, 0001, 0, etc.
    const idMatch = valor.match(/^#?P?(0*\d+)$/i)
    if (idMatch) {
      // Buscar por ID exacto, permitiendo ceros a la izquierda y el 0
      const idBuscado = Number(idMatch[1]);
      if (!isNaN(idBuscado)) {
        // Filtrar localmente si ya se cargaron préstamos
        if (todosLosPrestamos.length > 0) {
          const resultado = todosLosPrestamos.filter(p => Number(p.id_prestamo) === idBuscado)
          // Renderizar solo ese préstamo
          tablaPrestamos.innerHTML = ""
          if (resultado.length === 0) {
            tablaPrestamos.innerHTML = `
              <tr>
                <td colspan="8" class="text-center text-muted py-4">
                  <i class="bi bi-inbox fs-1"></i><br>
                  No se encontró el préstamo con ID #P${String(idBuscado).padStart(3, "0")}
                </td>
              </tr>
            `
            actualizarContadores(todosLosPrestamos)
            return
          }
          resultado.forEach((prestamo) => {
            const fila = document.createElement("tr")
            // ... Copiar la lógica de renderizado de fila de préstamo ...
            // Calcular días restantes y determinar estado
            const fechaDevolucion = new Date(prestamo.fecha_devolucion)
            const fechaActual = new Date()
            const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))

            let badgeEstado = ""
            let diasRestantes = ""
            let opcionesAcciones = ""

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
                    <li><a class="dropdown-item text-danger btn-multa" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-dias="${Math.abs(diferenciaDias)}" data-fecha="${prestamo.fecha_prestamo}"><i class="bi bi-currency-dollar me-2"></i>Enviar Multa</a></li>
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
                    <li><a class="dropdown-item btn-recordatorio" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-fecha="${prestamo.fecha_prestamo}"><i class="bi bi-envelope me-2"></i>Enviar Recordatorio</a></li>
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
          actualizarContadores(todosLosPrestamos)
          return
        }
        // Si no hay préstamos cargados, buscar en backend
        fetch(`/api/prestamos/${idBuscado}`, { credentials: "include" })
          .then(resp => resp.json())
          .then(prestamo => {
            tablaPrestamos.innerHTML = ""
            if (!prestamo || !prestamo.id_prestamo) {
              tablaPrestamos.innerHTML = `
                <tr>
                  <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i><br>
                    No se encontró el préstamo con ID #P${String(idBuscado).padStart(3, "0")}
                  </td>
                </tr>
              `
              return
            }
            const fila = document.createElement("tr")
            // ... Copiar la lógica de renderizado de fila de préstamo ...
            const fechaDevolucion = new Date(prestamo.fecha_devolucion)
            const fechaActual = new Date()
            const diferenciaDias = Math.ceil((fechaDevolucion - fechaActual) / (1000 * 60 * 60 * 24))

            let badgeEstado = ""
            let diasRestantes = ""
            let opcionesAcciones = ""

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
                    <li><a class="dropdown-item text-danger btn-multa" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-dias="${Math.abs(diferenciaDias)}" data-fecha="${prestamo.fecha_prestamo}"><i class="bi bi-currency-dollar me-2"></i>Enviar Multa</a></li>
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
                    <li><a class="dropdown-item btn-recordatorio" href="#" data-id="${prestamo.id_prestamo}" data-miembro="${prestamo.nombre_miembro}" data-libro="${prestamo.titulo_libro}" data-fecha="${prestamo.fecha_prestamo}"><i class="bi bi-envelope me-2"></i>Enviar Recordatorio</a></li>
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
        return
      }
    }
    // Si no es búsqueda por ID, buscar normalmente
    cargarPrestamos(valor)
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
          // Mostrar etiqueta si el miembro está inactivo
          const isActivo = (m.activo === undefined || m.activo === null) ? 1 : Number(m.activo)
          const idDisplay = m.id_miembro || m.id || 'N/A'
          const correoDisplay = m.correo || m.email || 'Sin correo'
          if (isActivo === 0) {
            li.classList.add('text-muted')
            li.style.cursor = 'not-allowed'
            li.innerHTML = `
              <strong>${m.nombres} ${m.apellidos} <span class="badge bg-secondary ms-2">Inactivo</span> <small class="text-muted">#${idDisplay}</small></strong><br>
              <small class="text-muted">${correoDisplay}</small>
            `
            li.addEventListener('click', () => {
              mostrarToast('Miembro inactivo. No se puede crear préstamo.', 'warning')
            })
          } else {
            li.innerHTML = `
              <strong>${m.nombres} ${m.apellidos} <small class="text-muted"></small></strong><br>
              <small class="text-muted">${correoDisplay}</small>
            `
            li.addEventListener("click", () => {
              // Mostrar solo el nombre en el input; mantener el id en la variable interna
              inputMiembro.value = `${m.nombres} ${m.apellidos}`
              miembroSeleccionado = m.id_miembro || m.id
              correoSeleccionado = m.correo || m.email || null
              listaMiembros.innerHTML = ""
              listaMiembros.style.display = "none"
            })
          }
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
          libroCantidadDisponible = null
          if (libroCantidadEl) libroCantidadEl.style.display = 'none'
          return
        }

        libros.forEach((l) => {
          const li = document.createElement("li")
          li.className = "list-group-item list-group-item-action"
          li.style.cursor = "pointer"
            li.innerHTML = `
              <strong>${l.titulo}</strong><br>
              <small class="text-muted">${l.cantidad || 0} disponibles</small>
            `
            li.dataset.cantidad = l.cantidad || 0
          li.addEventListener("click", () => {
            inputLibro.value = l.titulo
            libroSeleccionado = l.id_libro || l.id
            listaLibros.innerHTML = ""
            listaLibros.style.display = "none"
              // Mostrar cantidad disponible en el modal
              libroCantidadDisponible = Number(li.dataset.cantidad) || 0
              if (libroCantidadEl) {
                libroCantidadEl.style.display = 'block'
                libroCantidadEl.textContent = `Disponibles: ${libroCantidadDisponible}`
              }
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
      console.debug('Abrir modal Devolucion -> id:', id, 'miembro:', miembro, 'libro:', libro)

      // Cargar detalles del préstamo para calcular multa si aplica
      try {
        const resp = await fetch(`/api/prestamos/${id}`, { credentials: 'include' })
        console.debug('Fetch /api/prestamos status', resp.status)
        let prestamo = null
        if (resp.ok) {
          try { prestamo = await resp.json() } catch(parseErr) { console.warn('No se pudo parsear JSON del préstamo:', parseErr) }
        } else {
          console.warn('No se pudo obtener detalles del préstamo, status:', resp.status)
        }

        // Asegurar que exista el contenedor .alert-info en el modal; si no, crear uno
        let alertInfoEl = document.querySelector("#modalDevolucion .alert-info")
        if (!alertInfoEl) {
          const modalBody = document.querySelector('#modalDevolucion .modal-body')
          if (modalBody) {
            alertInfoEl = document.createElement('div')
            alertInfoEl.className = 'alert alert-info'
            modalBody.insertBefore(alertInfoEl, modalBody.firstChild)
          }
        }

        const miembroDisplay = escapeHtml((prestamo && prestamo.nombre_miembro) || miembro || '')
        const libroDisplay = escapeHtml((prestamo && prestamo.titulo_libro) || libro || '')
        if (alertInfoEl) {
          alertInfoEl.innerHTML = `\n          <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")}<br>\n          <strong>Miembro:</strong> ${miembroDisplay}<br>\n          <strong>Libro:</strong> ${libroDisplay}\n        `
        }

        // Establecer fecha actual como fecha de devolución por defecto
        const fechaHoy = new Date().toISOString().split('T')[0]
        const fechaInput = document.getElementById("fechaDevolucionReal")
        if (fechaInput) fechaInput.value = fechaHoy

        // Calcular días de retraso (si la fecha real es posterior a la fecha de devolución esperada)
        let montoMulta = 0
        try {
          const fechaDevolucionEsperada = prestamo.fecha_devolucion ? new Date(prestamo.fecha_devolucion) : null
          const fechaReal = new Date(fechaHoy)
          let diasRetraso = 0
          if (fechaDevolucionEsperada) {
            const diffMs = fechaReal.setHours(0,0,0,0) - fechaDevolucionEsperada.setHours(0,0,0,0)
            diasRetraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          }
          // Fallback: si no pudimos calcular, usar los días del botón (data-dias) cuando el préstamo está vencido
          if (!Number.isFinite(diasRetraso) || diasRetraso === 0) {
            const diasBtn = Number.parseInt(btn.dataset.dias || btn.dataset.dia || 0)
            if (Number.isFinite(diasBtn) && diasBtn > 0) diasRetraso = diasBtn
          }

          // Obtener configuración de multa (valor por día y días de tolerancia)
          let valorPorDia = 1.0
          let diasTolerancia = 0
          try {
            const cfgResp = await fetch('/api/perfil/multa', { credentials: 'include' })
            if (cfgResp.ok) {
              const cfgJson = await cfgResp.json()
              if (cfgJson && cfgJson.ok && cfgJson.data) {
                valorPorDia = parseFloat(cfgJson.data.valor_multa) || valorPorDia
                diasTolerancia = parseInt(cfgJson.data.dias_tolerancia) || diasTolerancia
              }
            }
          } catch (cfgErr) {
            console.warn('No se pudo cargar configuración de multa, usando valores por defecto', cfgErr)
          }

          const esVencidoFlag = (prestamo && prestamo.estado === 'Vencido') || (btn && btn.dataset && Number.parseInt(btn.dataset.dias || 0) > 0)

          const diasACobrarBase = Math.max(0, (Number.isFinite(diasRetraso) ? diasRetraso : 0) - (Number.isFinite(diasTolerancia) ? diasTolerancia : 0))
          let diasACobrar = diasACobrarBase
          montoMulta = +(diasACobrar * (Number.isFinite(valorPorDia) ? valorPorDia : 1.0))

          // Si sigue en cero pero el préstamo está vencido, forzar a mostrar con base en data-dias o al menos 1 día
          if ((montoMulta <= 0 || !Number.isFinite(montoMulta)) && esVencidoFlag) {
            const diasBtn = Number.parseInt(btn.dataset.dias || 1)
            diasACobrar = Math.max(1, diasBtn)
            montoMulta = +(diasACobrar * (Number.isFinite(valorPorDia) ? valorPorDia : 1.0))
          }

          console.debug('Cálculo multa -> diasRetraso:', diasRetraso, 'diasTolerancia:', diasTolerancia, 'valorPorDia:', valorPorDia, 'diasACobrar:', diasACobrar, 'montoMulta:', montoMulta, 'esVencidoFlag:', esVencidoFlag)
        } catch (e) {
          console.warn('Error calculando multa en cliente:', e)
          montoMulta = 0
        }

        // Mostrar monto de multa y checkbox si aplica
        try {
          const multaRow = document.getElementById('multaRow')
          const montoEl = document.getElementById('montoMultaDevolucion')
          const multaPagadaEl = document.getElementById('multaPagada')
          if (montoEl) montoEl.value = (Number.isFinite(montoMulta) ? montoMulta : 0).toFixed(2)
          // Mostrar siempre para vencidos, aunque el cálculo sea 0 (dejamos visible con 0.00)
          const esVencido = (prestamo && prestamo.estado === 'Vencido') || (btn && btn.dataset && Number.parseInt(btn.dataset.dias || 0) > 0)
          if (multaRow) multaRow.style.display = (montoMulta >= 0 || esVencido) ? 'block' : 'none'
          if (multaPagadaEl) multaPagadaEl.checked = false
        } catch (e) { /* noop */ }

        document.getElementById("formDevolucion").dataset.prestamoId = id

        const modal = new bootstrap.Modal(document.getElementById("modalDevolucion"))
        modal.show()
      } catch (err) {
        console.error('Error al cargar datos del préstamo para devolución:', err)
        // Fallback: mostrar modal con los datos mínimos disponibles (crear contenedor si falta)
        let alertElFallback = document.querySelector('#modalDevolucion .alert-info')
        if (!alertElFallback) {
          const modalBody = document.querySelector('#modalDevolucion .modal-body')
          if (modalBody) {
            alertElFallback = document.createElement('div')
            alertElFallback.className = 'alert alert-info'
            modalBody.insertBefore(alertElFallback, modalBody.firstChild)
          }
        }
        if (alertElFallback) {
          alertElFallback.innerHTML = `\n          <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")}<br>\n          <strong>Miembro:</strong> ${escapeHtml(miembro)}<br>\n          <strong>Libro:</strong> ${escapeHtml(libro)}\n        `
        }
        const fechaHoy = new Date().toISOString().split('T')[0]
        const fechaInput = document.getElementById("fechaDevolucionReal")
        if (fechaInput) fechaInput.value = fechaHoy
        document.getElementById("formDevolucion").dataset.prestamoId = id
        const modal = new bootstrap.Modal(document.getElementById("modalDevolucion"))
        modal.show()
      }
    }

    // Enviar recordatorio
    if (e.target.closest(".btn-recordatorio")) {
      const btn = e.target.closest(".btn-recordatorio")
      const id = btn.dataset.id

      // Cargar detalles del préstamo para obtener celular del miembro
      try {
        const resp = await fetch(`/api/prestamos/${id}`, { credentials: 'include' })
        if (!resp.ok) throw new Error('No se pudo obtener detalles del préstamo')
        const prestamo = await resp.json()

        const miembro = prestamo.nombre_miembro
        const libro = prestamo.titulo_libro || btn.dataset.libro
        const fechaFormateada = prestamo.fecha_prestamo ? new Date(prestamo.fecha_prestamo).toLocaleDateString('es-CO') : (btn.dataset.fecha ? new Date(btn.dataset.fecha).toLocaleDateString('es-CO') : '-')
        const telefonoMiembro = prestamo.celular_miembro || prestamo.celular || ''

        // Obtener datos de la institución para mostrar contacto en el modal
        let nombreInst = 'Biblioteca Municipal', telefonoInst = '310 123 4567', correoInst = 'biblioteca@ejemplo.com', direccionInst = '';
        try {
          const instResp = await fetch('/api/perfil/institucion', { credentials: 'include' })
          if (instResp.ok) {
            const instJson = await instResp.json()
            if (instJson && instJson.data) {
              const d = instJson.data
              // Priorizar el nombre real de la institución (campo `nombre`) antes que el nombre de plataforma
              nombreInst = d.nombre || d.nombrePlataforma || d.nombreInstitucion || nombreInst
              telefonoInst = d.telefono || d.telefonoInstitucion || d.telefono_institucion || telefonoInst
              correoInst = d.smtp_correo || d.smtpCorreo || d.correo || d.email || correoInst
            }
          }
        } catch (e) {
          console.warn('No se pudo cargar datos de la institución para el modal:', e)
        }

        document.querySelector("#modalRecordatorio .alert-secondary").innerHTML = `
          <strong>Para:</strong> ${miembro} ${telefonoMiembro ? ' - ' + telefonoMiembro : ''}<br>
          <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")} - ${libro}<br>
          <strong>Fecha del préstamo:</strong> ${fechaFormateada}<br>
        `

        // Guardar ID del préstamo en el formulario
        document.getElementById("formRecordatorio").dataset.prestamoId = id

        // Prefill mensaje con datos del miembro, libro, fecha y teléfono
        const mensajeDefault = [
          `*📚 Recordatorio de Devolución — ${nombreInst}*`,
          ``,
          `Hola *${miembro}* 👋,`,
          ``,
          `Te recordamos que tienes un libro pendiente de devolución:`,
          `📖 ${libro}`,
          `📅 Fecha de devolución: ${fechaFormateada}`,
          `*🔖 Préstamo:* P${String(id).padStart(3, '0')}`,
          ``,
          `Por favor entrega el libro en la fecha indicada para evitar recargos. Si necesitas una prórroga, responde a este mensaje indicando cuántos días necesitas.`,
          ``,
          `*¿Necesitas ayuda?*`,
          // Mostrar teléfono del miembro (si aplica) y siempre mostrar teléfono/correo de la institución
          telefonoMiembro ? `📞 Tel miembro: ${telefonoMiembro}` : '',
          `📞 Tel institución: ${telefonoInst} (Lun-Vie 9:00-17:00)`,
          correoInst ? `✉️ Correo institución: ${correoInst}` : '',
          ``,
          `Gracias por usar nuestros servicios.`,
          `${nombreInst} – Gestión de Préstamos${direccionInst ? ' — ' + direccionInst : ''}`
        ].join('\n')

        const textarea = document.getElementById('mensajeRecordatorio')
        if (textarea) textarea.value = mensajeDefault

        const modal = new bootstrap.Modal(document.getElementById("modalRecordatorio"))
        modal.show()
      } catch (err) {
        console.error('Error al cargar detalles del préstamo para recordatorio:', err)
        // Fallback: mostrar modal con los datos disponibles en el botón
        const miembro = btn.dataset.miembro
        const libro = btn.dataset.libro
        document.querySelector("#modalRecordatorio .alert-secondary").innerHTML = `
          <strong>Para:</strong> ${miembro}<br>
          <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")} - ${libro}<br>
          <strong>Fecha del préstamo:</strong> ${btn.dataset.fecha ? new Date(btn.dataset.fecha).toLocaleDateString('es-CO') : '-'}
        `
        document.getElementById("formRecordatorio").dataset.prestamoId = id
        const textarea = document.getElementById('mensajeRecordatorio')
        if (textarea) textarea.value = `Estimado/a ${btn.dataset.miembro},\n\nLe recordamos que el libro "${btn.dataset.libro}" prestado debe ser devuelto a la brevedad.\n\nGracias por su colaboración.`
        const modal = new bootstrap.Modal(document.getElementById("modalRecordatorio"))
        modal.show()
      }
    }

    // Enviar multa
    if (e.target.closest(".btn-multa")) {
      const btn = e.target.closest(".btn-multa")
      const id = btn.dataset.id
      const dias = btn.dataset.dias

      try {
        const resp = await fetch(`/api/prestamos/${id}`, { credentials: 'include' })
        if (!resp.ok) throw new Error('No se pudo obtener detalles del préstamo')
        const prestamo = await resp.json()

        const miembro = prestamo.nombre_miembro || btn.dataset.miembro
        const libro = prestamo.titulo_libro || btn.dataset.libro
        const telefonoMiembro = prestamo.celular_miembro || prestamo.celular || ''

        // Obtener configuración de multa (valor por día y días de tolerancia)
        let valorPorDia = 1.0
        let diasTolerancia = 0
        try {
          const cfgResp = await fetch('/api/perfil/multa', { credentials: 'include' })
          if (cfgResp.ok) {
            const cfgJson = await cfgResp.json()
            if (cfgJson && cfgJson.ok && cfgJson.data) {
              valorPorDia = parseFloat(cfgJson.data.valor_multa) || valorPorDia
              diasTolerancia = parseInt(cfgJson.data.dias_tolerancia) || diasTolerancia
            }
          }
        } catch (cfgErr) {
          console.warn('No se pudo cargar configuración de multa, usando valores por defecto', cfgErr)
        }

        // Calcular días a cobrar y monto final respetando la tolerancia
        const diasRetrasoTotal = Number.parseInt(dias) || 0
        const diasACobrar = Math.max(0, diasRetrasoTotal - (Number.isFinite(diasTolerancia) ? diasTolerancia : 0))
        const montoCalculado = (diasACobrar * (Number.isFinite(valorPorDia) ? valorPorDia : 1.0))

        // Obtener datos de la institución para mostrar contacto en el modal
        let nombreInst = 'Biblioteca Municipal', telefonoInst = '310 123 4567', correoInst = 'biblioteca@ejemplo.com', direccionInst = '';
        try {
          const instResp = await fetch('/api/perfil/institucion', { credentials: 'include' })
          if (instResp.ok) {
            const instJson = await instResp.json()
            if (instJson && instJson.data) {
              const d = instJson.data
              // Priorizar el nombre real de la institución (campo `nombre`) antes que el nombre de plataforma
              nombreInst = d.nombre || d.nombrePlataforma || d.nombreInstitucion || nombreInst
              telefonoInst = d.telefono || d.telefonoInstitucion || d.telefono_institucion || telefonoInst
              correoInst = d.smtp_correo || d.smtpCorreo || d.correo || d.email || correoInst
              direccionInst = d.direccion || ''
            }
          }
        } catch (e) {
          console.warn('No se pudo cargar datos de la institución para el modal:', e)
        }

        document.querySelector("#modalMulta .alert-danger").innerHTML = `
          <strong>Para:</strong> ${miembro} ${telefonoMiembro ? ' - ' + telefonoMiembro : ''}<br>
          <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")} - ${libro}<br>
          <strong>Días de retraso:</strong> ${diasRetrasoTotal} días<br>
          <strong>Días a cobrar (tolerancia ${diasTolerancia}):</strong> ${diasACobrar} días<br>
        `

        document.getElementById("montoMulta").value = montoCalculado.toFixed(2)

        // Guardar ID del préstamo en el formulario
        document.getElementById("formMulta").dataset.prestamoId = id

        const mensajeDefault = [
          `*⚠️ Aviso de Multa por Retraso — ${nombreInst}*`,
          ``,
          `Estimado/a *${miembro}*,`,
          ``,
          `Hemos registrado un retraso en la devolución de:`,
          `📖 ${libro}`,
          // `*🔖 Préstamo:* P${String(id).padStart(3, '0')}`,
          `*⏳ Días de retraso:* ${diasRetrasoTotal} (se cobran ${diasACobrar} día(s) al valor de $${valorPorDia.toFixed(2)})`,
          `*💰 Monto de la multa:* $${montoCalculado.toFixed(2)}`,
          ``,
          `Para regularizar tu situación puedes:`,
          `• Responder a este mensaje si necesitas información sobre el pago.`,
          ``,
          // Mostrar teléfono del miembro (si aplica) y siempre mostrar teléfono/correo de la institución
          `📞 Atención (institución): ${telefonoInst}`,
          correoInst ? `✉️ ${correoInst}` : '',
          ``,
          `Si ya realizaste el pago, por favor indícanos el comprobante respondiendo con el número de préstamo.`,
          ``,
          `Gracias por tu atención.`,
          `${nombreInst} – Gestión de Préstamos${direccionInst ? ' — ' + direccionInst : ''}`
        ].join('\n')

        const textarea = document.getElementById('mensajeMulta')
        if (textarea) textarea.value = mensajeDefault

        const modal = new bootstrap.Modal(document.getElementById("modalMulta"))
        modal.show()
      } catch (err) {
        console.error('Error al cargar detalles del préstamo para multa:', err)
        // Fallback
        const miembro = btn.dataset.miembro
        const libro = btn.dataset.libro
        const dias = btn.dataset.dias
        document.querySelector("#modalMulta .alert-danger").innerHTML = `
          <strong>Para:</strong> ${miembro}<br>
          <strong>Préstamo:</strong> #P${String(id).padStart(3, "0")} - ${libro}<br>
          <strong>Días de retraso:</strong> ${dias} días
        `
        document.getElementById("montoMulta").value = (Number.parseFloat(dias) * 1.0).toFixed(2)
        document.getElementById("formMulta").dataset.prestamoId = id
        const textarea = document.getElementById('mensajeMulta')
        if (textarea) textarea.value = `Estimado/a ${miembro},\n\nSe ha registrado una multa por retraso en el préstamo del libro "${libro}".\n\nMonto: $${(Number.parseFloat(dias) * 1.0).toFixed(2)}.\n\nPor favor acérquese a la biblioteca para regularizar su situación.`
        const modal = new bootstrap.Modal(document.getElementById("modalMulta"))
        modal.show()
      }
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

      // Validar stock local antes de enviar (mejor UX). El backend también valida transaccionalmente.
      if (libroCantidadDisponible !== null && Number(libroCantidadDisponible) <= 0) {
        mostrarToast('No hay copias disponibles para este libro', 'warning')
        return
      }

      const nuevoPrestamo = {
        id_miembro: miembroSeleccionado,
        id_libro: libroSeleccionado,
        id_correo: correoSeleccionado,
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
          libroCantidadDisponible = null
          if (libroCantidadEl) libroCantidadEl.style.display = 'none'
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

      // Leer multa y si fue pagada desde el modal (si existen los campos)
      const montoMulta = document.getElementById('montoMultaDevolucion') ? parseFloat(document.getElementById('montoMultaDevolucion').value) || 0 : 0
      const multaPagada = document.getElementById('multaPagada') ? !!document.getElementById('multaPagada').checked : false

      const datosDevolucion = {
        estado: "Devuelto",
        fecha_devolucion: fechaDevolucionReal, // Actualizar la fecha de devolución a la fecha real
        fecha_devolucion_real: fechaDevolucionReal,
        estado_libro: document.getElementById("estadoLibro").value,
        notas: document.getElementById("notasDevolucion").value,
        multa: montoMulta,
        multa_pagada: multaPagada
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

      // Determinar canales seleccionados (buscar las casillas DENTRO del formulario para evitar IDs duplicados)
      const enviarEmail = formRecordatorio.querySelector('#checkEmail') ? formRecordatorio.querySelector('#checkEmail').checked : true
      const enviarWhatsapp = formRecordatorio.querySelector('#checkWhatsapp') ? formRecordatorio.querySelector('#checkWhatsapp').checked : false

      if (!enviarEmail && !enviarWhatsapp) {
        mostrarToast('Seleccione al menos un canal (Email o WhatsApp)', 'warning')
        return
      }

      const via = enviarEmail && enviarWhatsapp ? 'both' : (enviarEmail ? 'email' : 'whatsapp')

      try {
        const mensaje = document.getElementById('mensajeRecordatorio') ? document.getElementById('mensajeRecordatorio').value.trim() : ''
        const response = await fetch("/api/emails/recordatorio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id_prestamo: prestamoId, via, mensaje }),
        })

        const data = await response.json()

        if (response.ok) {
          // Mostrar según canal solicitado
          if (via === 'email') mostrarToast(`Recordatorio enviado por Email a ${data.destinatario}`, 'success')
          else if (via === 'whatsapp') mostrarToast(`Recordatorio enviado por WhatsApp (si aplica)`, 'success')
          else mostrarToast(`Recordatorio enviado (Email + WhatsApp si aplica) a ${data.destinatario}`, 'success')

          // Si el backend informa que WhatsApp no se envió por falta de conexión, avisar al usuario
          if (data.resultados && data.resultados.whatsapp === 'no_conectado') {
            mostrarToast('Aviso: WhatsApp no conectado. Mensaje no enviado por WhatsApp.', 'warning')
          }

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

      // Determinar canales seleccionados para multa (leer casillas DENTRO del formulario para evitar IDs duplicados en la página)
      const enviarEmailM = formMulta.querySelector('#checkEmail') ? formMulta.querySelector('#checkEmail').checked : true
      const enviarWhatsappM = formMulta.querySelector('#checkWhatsapp') ? formMulta.querySelector('#checkWhatsapp').checked : false

      if (!enviarEmailM && !enviarWhatsappM) {
        mostrarToast('Seleccione al menos un canal (Email o WhatsApp)', 'warning')
        return
      }

      const viaM = enviarEmailM && enviarWhatsappM ? 'both' : (enviarEmailM ? 'email' : 'whatsapp')

      try {
        const mensajeMulta = document.getElementById('mensajeMulta') ? document.getElementById('mensajeMulta').value.trim() : ''
        const response = await fetch("/api/emails/multa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            id_prestamo: prestamoId,
            monto_multa: parseFloat(montoMulta),
            via: viaM,
            mensaje: mensajeMulta
          }),
        })

        const data = await response.json()

        if (response.ok) {
          if (viaM === 'email') mostrarToast(`Multa de $${data.monto.toFixed(2)} enviada por Email a ${data.destinatario}`, 'success')
          else if (viaM === 'whatsapp') mostrarToast(`Multa solicitada por WhatsApp (si aplica)`, 'success')
          else mostrarToast(`Multa enviada (Email + WhatsApp si aplica) a ${data.destinatario}`, 'success')

          if (data.resultados && data.resultados.whatsapp === 'no_conectado') {
            mostrarToast('Aviso: WhatsApp no conectado. Mensaje no enviado por WhatsApp.', 'warning')
          }

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



  // ----Funcionalidad: Modal de Beneficios (cargar desde backend + asignar)
  const btnFiltrarBeneficios = document.getElementById("btnFiltrarBeneficios")
  const minimoPrestamos = document.getElementById("minimoPrestamos")
  const diasPeriodo = document.getElementById("diasPeriodo")
  const minDiasPorPrestamoEl = document.getElementById("minDiasPorPrestamo")
  const cantidadFiltrada = document.getElementById("cantidadFiltrada")
  const diasFiltrados = document.getElementById("diasFiltrados")
  const minDiasFiltradoEl = document.getElementById('minDiasFiltrado')
  const tablaBeneficiosEl = document.getElementById("tablaBeneficios")
  const modalBeneficiosEl = document.getElementById("modalBeneficios")
  const modalAsignarBeneficioEl = document.getElementById("modalAsignarBeneficio")
  const formAsignarBeneficio = document.getElementById("formAsignarBeneficio")
  const beneficiosDatalistEl = document.getElementById('beneficiosDatalist')
  const beneficiosInputEl = document.getElementById('beneficiosInput')
  const beneficiosTagsEl = document.getElementById('beneficiosTags')
  const beneficiosDropdownEl = document.getElementById('beneficiosDropdown')
  const beneficiosInputBox = document.getElementById('beneficiosInputBox')
  const beneficiosToggleBtn = document.getElementById('beneficiosToggleBtn')

  // Cache de beneficios y selección (solo 1 beneficio)
  let beneficiosCache = []
  let selectedBeneficioId = null // id seleccionado
  let currentMiembroNombre = ''

  // Cargar beneficios disponibles desde backend y poblar el datalist
  async function cargarBeneficiosDisponibles() {
    try {
      const resp = await fetch('/api/beneficios', { credentials: 'include' })
      const json = await resp.json()
      if (!resp.ok || !json.ok) {
        beneficiosCache = Array.isArray(json) ? json : (json.beneficios || [])
      } else {
        beneficiosCache = json.beneficios || []
      }

      // Poblar datalist
      if (beneficiosDatalistEl) {
        beneficiosDatalistEl.innerHTML = ''
        beneficiosCache.forEach(b => {
          const opt = document.createElement('option')
          opt.value = b.nombre || b.nombre_beneficio || ''
          // almacenar id en data-id para búsqueda posterior
          if (b.id_beneficio || b.id) opt.dataset.id = String(b.id_beneficio || b.id)
          beneficiosDatalistEl.appendChild(opt)
        })
      }
    } catch (err) {
      console.error('Error cargando beneficios:', err)
      if (beneficiosDatalistEl) beneficiosDatalistEl.innerHTML = ''
    }
  }

  // Seleccionar beneficio por nombre (busca id en cache) -- selección única
  function addBeneficioByName(name) {
    if (!name) return
    const found = beneficiosCache.find(b => String(b.nombre || b.nombre_beneficio || '').toLowerCase() === String(name).toLowerCase())
    if (!found) {
      mostrarToast('Beneficio no encontrado en la lista', 'warning')
      return
    }
    const id = String(found.id_beneficio || found.id || '')
    if (!id) return
    selectedBeneficioId = id
    // mostrar el nombre en el input
    beneficiosInputEl.value = found.nombre || found.nombre_beneficio || ''
    // ocultar dropdown
    if (beneficiosDropdownEl) beneficiosDropdownEl.style.display = 'none'

    // Insertar la plantilla solicitada con título y descripción en el mensaje del modal
    try {
      const mensajeEl = document.getElementById('mensajeBeneficio')
      const desc = found.descripcion || found.descripcion_beneficio || found.descripcion_corta || found.detalle || ''
      if (mensajeEl) {
        const titulo = found.nombre || found.nombre_beneficio || ''
        const plantilla = `🎉¡Felicidades ${currentMiembroNombre || ''}!\n\nHas sido seleccionado/a para recibir un beneficio especial por tu excelente participación en nuestra biblioteca.\n\n\nComo reconocimiento, te hemos asignado un beneficio especial.\n*titulo*\n${desc}🥳🥳\n\n¡Gracias por ser parte de nuestra comunidad de lectores! `
        mensajeEl.value = plantilla
      }
    } catch (e) {
      // noop
    }
  }

  // Seleccionar beneficio por id (selección única)
  function addBeneficioById(id) {
    const found = beneficiosCache.find(b => String(b.id_beneficio || b.id || '') === String(id))
    if (!found) {
      mostrarToast('Beneficio no encontrado', 'warning')
      return
    }
    const _id = String(found.id_beneficio || found.id || '')
    if (!_id) return
    selectedBeneficioId = _id
    beneficiosInputEl.value = found.nombre || found.nombre_beneficio || ''
    if (beneficiosDropdownEl) beneficiosDropdownEl.style.display = 'none'

    // Insertar la plantilla solicitada con título y descripción en el mensaje del modal
    try {
      const mensajeEl = document.getElementById('mensajeBeneficio')
      const desc = found.descripcion || found.descripcion_beneficio || found.descripcion_corta || found.detalle || ''
      if (mensajeEl) {
        const titulo = found.nombre || found.nombre_beneficio || ''
        const plantilla = `¡Felicidades ${currentMiembroNombre || ''}!\n\nHas sido seleccionado/a para recibir un beneficio especial por tu excelente participación en nuestra biblioteca.\n\n\nComo reconocimiento, te hemos asignado un beneficio especial.\n${titulo}\n"${desc}"\n\n¡Gracias por ser parte de nuestra comunidad de lectores!`
        mensajeEl.value = plantilla
      }
    } catch (e) {
      // noop
    }
  }

  // En la versión de selección única, no mostramos chips; el input muestra la opción
  function renderBeneficioTags() {
    // mantener el valor del input si hay selección
    if (!beneficiosInputEl) return
    if (!selectedBeneficioId) {
      beneficiosInputEl.value = ''
      return
    }
    const b = beneficiosCache.find(x => String(x.id_beneficio || x.id) === String(selectedBeneficioId)) || { nombre: selectedBeneficioId }
    beneficiosInputEl.value = b.nombre || b.nombre_beneficio || ''
  }

  // Añadir con Enter o al seleccionar del datalist
  if (beneficiosInputEl) {
    beneficiosInputEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault()
        addBeneficioByName(beneficiosInputEl.value.trim())
      }
    })
    beneficiosInputEl.addEventListener('blur', () => {
      // on blur, try to add if exact match
      const val = beneficiosInputEl.value.trim()
      if (val) addBeneficioByName(val)
    })
  }

  // Helper para escapar texto (evita inyección desde backend)
  function escapeHtml(str) {
    if (!str && str !== 0) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  async function cargarMiembrosBeneficios(min = 0, dias = 30, minDaysPerLoan = 7) {
    if (!tablaBeneficiosEl) return
    cantidadFiltrada.textContent = min
    diasFiltrados.textContent = dias
    if (minDiasFiltradoEl) minDiasFiltradoEl.textContent = minDaysPerLoan

    try {
      const resp = await fetch(`/api/beneficios/miembros?min=${encodeURIComponent(min)}&dias=${encodeURIComponent(dias)}&minDays=${encodeURIComponent(minDaysPerLoan)}`, {
        credentials: 'include'
      })
      if (!resp.ok) {
        mostrarToast('No se pudo obtener miembros', 'danger')
        return
      }

      const miembros = await resp.json()
      tablaBeneficiosEl.innerHTML = ''

      if (!miembros || miembros.length === 0) {
        tablaBeneficiosEl.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No se encontraron miembros</td></tr>`
        return
      }

      miembros.forEach((m) => {
        const tr = document.createElement('tr')
        const nombre = `${m.nombres} ${m.apellidos}`
        const prestamos = m.prestamos_count || 0

        tr.innerHTML = `
          <td>
            <strong>${nombre}</strong><br>
            <small class="text-muted">ID: ${m.id || m.id_miembro}</small>
          </td>
          <td>${m.email || ''}</td>
          <td><span class="badge bg-success">${prestamos} préstamos</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-asignar-beneficio" data-bs-toggle="modal" data-bs-target="#modalAsignarBeneficio" data-id="${m.id_miembro}" data-nombre="${nombre}" data-prestamos="${prestamos}" data-email="${m.email || ''}">
              <i class="bi bi-gift me-1"></i>Asignar
            </button>
          </td>
        `

        tablaBeneficiosEl.appendChild(tr)
      })
    } catch (error) {
      console.error('Error al cargar miembros:', error)
      mostrarToast('Error al cargar miembros', 'danger')
    }
  }

  if (btnFiltrarBeneficios) {
    btnFiltrarBeneficios.addEventListener('click', (e) => {
      e.preventDefault()
      const min = Number(minimoPrestamos ? minimoPrestamos.value : 0) || 0
      const dias = Number(diasPeriodo ? diasPeriodo.value : 30) || 30
      const minDaysPerLoan = Number(minDiasPorPrestamoEl ? minDiasPorPrestamoEl.value : 7) || 7
      cargarMiembrosBeneficios(min, dias, minDaysPerLoan)
    })
  }

  // Cargar cuando se abre el modal
  if (modalBeneficiosEl) {
    modalBeneficiosEl.addEventListener('shown.bs.modal', () => {
      const min = Number(minimoPrestamos ? minimoPrestamos.value : 0) || 0
      const dias = Number(diasPeriodo ? diasPeriodo.value : 30) || 30
      const minDaysPerLoan = Number(minDiasPorPrestamoEl ? minDiasPorPrestamoEl.value : 7) || 7
      cargarMiembrosBeneficios(min, dias, minDaysPerLoan)
      // También cargar la lista de tipos de beneficios
      cargarBeneficiosDisponibles()
    })
  }

  // Población del dropdown y comportamiento del input
  function populateBeneficiosDropdown(filter = '') {
    if (!beneficiosDropdownEl) return
    beneficiosDropdownEl.innerHTML = ''
    const q = String(filter || '').toLowerCase()
    const list = beneficiosCache.filter(b => (b.nombre || b.nombre_beneficio || '').toLowerCase().includes(q))
    if (list.length === 0) {
      beneficiosDropdownEl.style.display = 'none'
      return
    }
    list.forEach(b => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'list-group-item list-group-item-action'
      btn.textContent = b.nombre || b.nombre_beneficio || ''
      btn.dataset.id = String(b.id_beneficio || b.id || '')
      // use mousedown to allow selection before blur
      btn.addEventListener('mousedown', (ev) => {
        ev.preventDefault()
        addBeneficioById(btn.dataset.id)
        // hide dropdown shortly after
        setTimeout(() => { if (beneficiosDropdownEl) beneficiosDropdownEl.style.display = 'none' }, 50)
      })
      beneficiosDropdownEl.appendChild(btn)
    })
    beneficiosDropdownEl.style.display = 'block'
  }

  if (beneficiosInputEl) {
    beneficiosInputEl.addEventListener('focus', () => {
      populateBeneficiosDropdown('')
    })
    beneficiosInputEl.addEventListener('input', (e) => {
      populateBeneficiosDropdown(e.target.value || '')
    })
    beneficiosInputEl.addEventListener('blur', () => {
      // hide after a short delay to allow click
      setTimeout(() => { if (beneficiosDropdownEl) beneficiosDropdownEl.style.display = 'none' }, 150)
    })
    // If user clicks the surrounding box, focus the input
    if (beneficiosInputBox) {
      beneficiosInputBox.addEventListener('click', (e) => {
        // avoid focusing when clicking the remove button inside a tag
        const target = e.target
        if (target && target.closest && target.closest('.btn-close')) return
        beneficiosInputEl.focus()
      })
    }
    // Toggle button to open/close full list
    if (beneficiosToggleBtn) {
      beneficiosToggleBtn.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        if (!beneficiosDropdownEl) return
        if (beneficiosDropdownEl.style.display === 'block') {
          beneficiosDropdownEl.style.display = 'none'
        } else {
          // show full list
          populateBeneficiosDropdown('')
          // focus input for keyboard
          try { beneficiosInputEl.focus() } catch(e){}
        }
      })
    }
  }

  // Delegación: abrir modal de asignación con datos del miembro
  if (tablaBeneficiosEl && modalAsignarBeneficioEl && formAsignarBeneficio) {
    tablaBeneficiosEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-asignar-beneficio')
      if (!btn) return

      const miembroId = btn.dataset.id || ''
      const nombre = btn.dataset.nombre || ''
      const prestamosNum = btn.dataset.prestamos || '0'

      const alertDiv = modalAsignarBeneficioEl.querySelector('.alert-success')
      if (alertDiv) {
        alertDiv.innerHTML = `<strong>Miembro:</strong> ${nombre}<br><strong>Préstamos en periodo:</strong> ${prestamosNum}`
      }

      formAsignarBeneficio.dataset.miembroId = miembroId
      // recordar que abrimos este modal desde modalBeneficios para poder volver a él
      try { window.__openedFrom = 'modalBeneficios' } catch (e) {}
      currentMiembroNombre = nombre || ''
      // limpiar selección anterior y preparar input (selección única)
      selectedBeneficioId = null
      renderBeneficioTags()
      // Asegurarse de tener la lista cargada
      try { cargarBeneficiosDisponibles() } catch(e){}
      const mensajeInput = document.getElementById('mensajeBeneficio')
      if (mensajeInput) {
        mensajeInput.value = `¡Felicidades ${nombre}!\n\nHas sido seleccionado/a para recibir un beneficio especial por tu excelente participación en nuestra biblioteca.\n\n\nComo reconocimiento, te hemos asignado un beneficio especial.\n\n\n¡Gracias por ser parte de nuestra comunidad de lectores!`
      }
    })

    // Manejar envío del formulario de asignar beneficio (intento POST, fallback simulado)
    formAsignarBeneficio.addEventListener('submit', async (e) => {
      e.preventDefault()
      const miembroId = formAsignarBeneficio.dataset.miembroId || ''
      const mensaje = document.getElementById('mensajeBeneficio').value

      // usar el id seleccionado (solo 1)
      if (!selectedBeneficioId) {
        mostrarToast('Seleccione un beneficio', 'warning')
        return
      }

      try {
        // leer casillas de canales dentro del formulario
        const enviarEmail = formAsignarBeneficio.querySelector('#checkEmail') ? formAsignarBeneficio.querySelector('#checkEmail').checked : true
        const enviarWhatsapp = formAsignarBeneficio.querySelector('#checkWhatsapp') ? formAsignarBeneficio.querySelector('#checkWhatsapp').checked : false

        const body = { id_miembro: miembroId, tipo: selectedBeneficioId, mensaje, canales: { email: !!enviarEmail, whatsapp: !!enviarWhatsapp } }
        const resp = await fetch('/api/beneficios/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })

        const data = await resp.json().catch(() => null)
        console.log('respuesta /api/beneficios/asignar ->', resp.status, data)

        if (resp.ok && data && data.ok) {
          const r = data.resultados || {}
          const dest = data.destinatario || ''
          // Mostrar toasts específicos por canal
          try {
            if (r.email === 'enviado') {
              mostrarToast(`Email enviado a ${dest}`, 'success')
            } else if (r.email === 'error') {
              mostrarToast('Error enviando Email', 'danger')
            } else if (r.email === 'no_email') {
              mostrarToast('Miembro sin email registrado', 'warning')
            }

            if (r.whatsapp === 'enviado') {
              mostrarToast(`WhatsApp enviado a ${dest}`, 'success')
            } else if (r.whatsapp === 'no_conectado') {
              mostrarToast('WhatsApp no está vinculado o no está conectado', 'warning')
            } else if (r.whatsapp === 'no_celular') {
              mostrarToast('Miembro sin número de celular registrado', 'warning')
            } else if (r.whatsapp === 'error') {
              mostrarToast('Error enviando WhatsApp', 'danger')
            }
          } catch (e) { console.warn(e) }
          // limpiar cualquier aviso inline si existe
          try { document.getElementById('canalesStatus').innerHTML = '' } catch (e) {}
        } else if (resp.ok) {
          mostrarToast('Beneficio asignado (respuesta inesperada del servidor)', 'warning')
        } else {
          const msg = (data && (data.mensaje || data.error)) || 'Error al asignar beneficio'
          mostrarToast(msg, 'danger')
          try { document.getElementById('canalesStatus').innerHTML = '' } catch(e){}
        }
      } catch (err) {
        console.error('Error llamando /api/beneficios/asignar', err)
        mostrarToast('Error enviando notificación de beneficio', 'danger')
      }

      // Indicar que queremos volver a este modal cuando se cierre el modalMensaje
      try { window.__returnToModal = 'modalAsignarBeneficio' } catch (e) {}
      const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAsignarBeneficio'))
      if (modalInstance) modalInstance.hide()
    })
  }

  // Inicializar
  cargarPrestamos()

  // Manejo: cuando se muestra el modal genérico `#modalMensaje`, ocultar cualquier modal
  // que esté abierto (por ejemplo `modalAsignarBeneficio`) y recordar el último abierto
  // para volver a mostrarlo cuando `modalMensaje` se cierre.
  try {
    const modalMensajeEl = document.getElementById('modalMensaje')
    if (modalMensajeEl) {
      modalMensajeEl.addEventListener('shown.bs.modal', () => {
        try {
          const open = Array.from(document.querySelectorAll('.modal.show')).filter(m => m.id && m.id !== 'modalMensaje')
          if (open.length > 0) {
            // recordar el último modal abierto
            window.__returnToModal = open[open.length - 1].id
            // ocultar todos los modales abiertos (excepto modalMensaje)
            open.forEach(m => {
              try {
                const inst = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m)
                inst.hide()
              } catch (e) {}
            })
          }
        } catch (e) {
          // noop
        }
      })

      modalMensajeEl.addEventListener('hidden.bs.modal', () => {
        try {
          const id = window.__returnToModal
          if (id) {
            window.__returnToModal = null
            const el = document.getElementById(id)
            if (el) {
              const inst = new bootstrap.Modal(el)
              inst.show()
            }
          }
        } catch (e) {
          // noop
        }
      })
    }
  } catch (e) {
    // noop
  }

  // Si el modal de asignación se cierra, volver al modal de listado si se abrió desde allí
  try {
    if (modalAsignarBeneficioEl) {
      modalAsignarBeneficioEl.addEventListener('hidden.bs.modal', () => {
        try {
          if (window.__openedFrom === 'modalBeneficios' && modalBeneficiosEl) {
            // limpiar la marca antes de reabrir
            window.__openedFrom = null
            const inst = new bootstrap.Modal(modalBeneficiosEl)
            inst.show()
          }
        } catch (e) {
          // noop
        }
      })
    }
  } catch (e) {}






  
})
