import { Chart } from "@/components/ui/chart"
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

// Datos de ejemplo para las multas por mes
const multasPorMes = {
  "2025-01": { total: 1850, cantidad: 28, pagadas: 22, pendientes: 6 },
  "2024-12": { total: 2100, cantidad: 32, pagadas: 28, pendientes: 4 },
  "2024-11": { total: 2450, cantidad: 38, pagadas: 32, pendientes: 6 },
  "2024-10": { total: 2800, cantidad: 42, pagadas: 38, pendientes: 4 },
  "2024-09": { total: 2300, cantidad: 35, pagadas: 30, pendientes: 5 },
  "2024-08": { total: 1950, cantidad: 30, pagadas: 27, pendientes: 3 },
}

// Cambiar datos de multas según el mes seleccionado
document.getElementById("selectMesMultas").addEventListener("change", function () {
  const mesSeleccionado = this.value
  const datos = multasPorMes[mesSeleccionado]

  document.getElementById("totalMultasMes").textContent = `$${datos.total.toLocaleString()}`
  document.getElementById("cantidadMultasMes").textContent = datos.cantidad
  document.getElementById("multasPagadas").textContent = datos.pagadas
  document.getElementById("multasPendientes").textContent = datos.pendientes
})

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

// Gráfico de Préstamos por Categoría (Dona)
const ctxCategoria = document.getElementById("graficoPrestamosCategoria").getContext("2d")
const graficoPrestamosCategoria = new Chart(ctxCategoria, {
  type: "doughnut",
  data: {
    labels: ["Terror", "Romance", "Ciencia Ficción", "Fantasía", "Misterio", "Aventura", "Poesía"],
    datasets: [
      {
        label: "Préstamos Activos",
        data: [25, 18, 32, 28, 15, 20, 4],
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

// Botón de logout
document.getElementById("logoutButton").addEventListener("click", () => {
  if (confirm("¿Estás seguro de que deseas salir?")) {
    // Aquí iría la lógica de logout
    window.location.href = "/login"
  }
})
