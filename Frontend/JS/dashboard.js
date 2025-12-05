// Actualizar fecha y hora en tiempo real
function actualizarFechaHora() {
  const ahora = new Date()
  const opciones = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }
  const fechaHoraTexto = ahora.toLocaleDateString("es-ES", opciones)
  document.getElementById("currentDateTime").textContent = fechaHoraTexto
}

// Actualizar cada segundo
actualizarFechaHora()
setInterval(actualizarFechaHora, 1000)

// Cargar resumen del dashboard
async function cargarResumen() {
  try {
    const response = await fetch('/api/dashboard/resumen', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      console.error('Error al cargar resumen del dashboard:', response.status)
      return
    }
    
    const datos = await response.json()
    
    // Actualizar contadores
    const contadores = document.querySelectorAll('.counter-value')
    if (contadores.length >= 6) {
      contadores[0].textContent = datos.prestamosActivos || 0
      contadores[1].textContent = datos.prestamosVencidos || 0
      contadores[2].textContent = datos.miembrosRegistrados || 0
      contadores[3].textContent = datos.librosRegistrados || 0
      contadores[4].textContent = datos.beneficiosOtorgados || 0
      contadores[5].textContent = `$${(datos.multasDelMes || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  } catch (error) {
    console.error('Error cargando resumen:', error)
  }
}

// Cargar resumen al iniciar
cargarResumen()

// Cargar estadísticas de multas desde la BD
async function cargarEstadisticasMultas(mes) {
  try {
    console.log('Cargando estadísticas para el mes:', mes);
    const response = await fetch(`/api/dashboard/multas?mes=${mes}`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      console.error('Error al cargar estadísticas de multas:', response.status)
      return
    }
    
    const datos = await response.json()
    console.log('Datos recibidos del servidor:', datos);
    
    document.getElementById("totalMultasMes").textContent = `$${(datos.totalMultas || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    document.getElementById("cantidadMultasMes").textContent = datos.generadas || 0
    document.getElementById("multasPagadas").textContent = datos.pagadas || 0
    document.getElementById("multasPendientes").textContent = datos.pendientes || 0
  } catch (error) {
    console.error('Error cargando multas:', error)
    document.getElementById("totalMultasMes").textContent = '$0.00'
    document.getElementById("cantidadMultasMes").textContent = '0'
    document.getElementById("multasPagadas").textContent = '0'
    document.getElementById("multasPendientes").textContent = '0'
  }
}

// Inicializar selector de mes con el mes actual
const hoy = new Date()
const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
const selectMes = document.getElementById("selectMesMultas")

if (selectMes) {
  // Generar opciones de meses (últimos 12 meses) - Solo nombre del mes
  selectMes.innerHTML = ''
  for (let i = 0; i < 12; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const texto = meses[fecha.getMonth()] // Solo el nombre del mes, sin el año
    const option = document.createElement('option')
    option.value = valor
    option.textContent = texto
    if (i === 0) option.selected = true // El primer elemento es el mes actual
    selectMes.appendChild(option)
  }

  // Cargar estadísticas del mes actual
  cargarEstadisticasMultas(mesActual)

  // Cambiar datos de multas según el mes seleccionado
  selectMes.addEventListener("change", function () {
    cargarEstadisticasMultas(this.value)
  })
}

// Configuración de colores para los gráficos
const colores = {
  primary: "#003049",
  secondary: "#023e8a",
  accent: "#669bbc",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  info: "#17a2b8",
  purple: "#6f42c1",
  orange: "#fd7e14",
}

// Gráfico de Préstamos por Mes (Barras)
const ctxMes = document.getElementById("graficoPrestamosMes").getContext("2d")
const graficoPrestamosMes = new Chart(ctxMes, {
  type: "bar",
  data: {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    datasets: [
      {
        label: "Préstamos Realizados",
        data: [120, 150, 180, 140, 190, 220, 210, 230, 250, 270, 260, 280],
        backgroundColor: colores.primary,
        borderColor: colores.secondary,
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: colores.secondary,
      },
      {
        label: "Préstamos Devueltos",
        data: [110, 140, 170, 130, 180, 210, 200, 220, 240, 260, 250, 270],
        backgroundColor: colores.success,
        borderColor: colores.success,
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: "#218838",
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          font: {
            size: 12,
            weight: "bold",
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  },
})

// Cargar datos reales de libros por categoría
async function cargarLibrosPorCategoria() {
  try {
    const response = await fetch('/api/dashboard/libros-categoria', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      console.error('Error al cargar libros por categoría:', response.status)
      return
    }
    
    const datos = await response.json()
    console.log('Datos de libros por categoría:', datos);
    
    if (datos && datos.length > 0) {
      const labels = datos.map(d => d.categoria)
      const dataValues = datos.map(d => d.cantidad)
      
      // Destruir gráfico anterior si existe
      if (graficoPrestamosCategoria) {
        graficoPrestamosCategoria.destroy()
      }
      
      // Crear nuevo gráfico con datos reales
      const ctxCategoria = document.getElementById("graficoPrestamosCategoria").getContext("2d")
      graficoPrestamosCategoria = new Chart(ctxCategoria, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Libros por Categoría",
              data: dataValues,
              backgroundColor: [
                colores.danger,
                colores.warning,
                colores.primary,
                colores.purple,
                colores.secondary,
                colores.success,
                colores.accent,
              ],
              borderColor: "#fff",
              borderWidth: 3,
              hoverOffset: 15,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                font: {
                  size: 11,
                },
                padding: 12,
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              titleFont: {
                size: 13,
                weight: "bold",
              },
              bodyFont: {
                size: 12,
              },
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const label = context.label || ""
                  const value = context.parsed || 0
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = ((value / total) * 100).toFixed(1)
                  return `${label}: ${value} (${percentage}%)`
                },
              },
            },
          },
        },
      })
    }
  } catch (error) {
    console.error('Error cargando libros por categoría:', error)
  }
}

// Cargar datos reales de libros al iniciar
cargarLibrosPorCategoria()

document.getElementById("logoutButton").addEventListener("click", () => {
  if (confirm("¿Estás seguro de que deseas salir?")) {
    // Aquí iría la lógica de logout
    window.location.href = "/login"
  }
})
