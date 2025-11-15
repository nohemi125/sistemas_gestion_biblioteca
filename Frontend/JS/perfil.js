// Función para mostrar/ocultar contraseña
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId)
  const icon = document.getElementById("icon" + fieldId.charAt(0).toUpperCase() + fieldId.slice(1))

  if (field.type === "password") {
    field.type = "text"
    icon.classList.remove("bi-eye")
    icon.classList.add("bi-eye-slash")
  } else {
    field.type = "password"
    icon.classList.remove("bi-eye-slash")
    icon.classList.add("bi-eye")
  }
}

// Vista previa del logo en tiempo real
document.getElementById("inputLogo")?.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      document.getElementById("logoPreview").src = event.target.result
      document.getElementById("logoPreviewSmall").src = event.target.result
    }
    reader.readAsDataURL(file)
  }
})

// Actualizar vista previa en tiempo real
document.getElementById("nombreInstitucion")?.addEventListener("input", function () {
  document.getElementById("previewNombreInstitucion").textContent = this.value || "Nombre de la Institución"
})

document.getElementById("nombrePlataforma")?.addEventListener("input", function () {
  document.getElementById("previewNombrePlataforma").textContent = this.value || "Nombre de la Plataforma"
})

document.getElementById("eslogan")?.addEventListener("input", function () {
  document.getElementById("previewEslogan").textContent = this.value || "Sin eslogan"
})

// Actualizar colores en vista previa
document.getElementById("colorPrimario")?.addEventListener("input", function () {
  this.nextElementSibling.value = this.value
  document.documentElement.style.setProperty("--color-primario", this.value)
})

document.getElementById("colorSecundario")?.addEventListener("input", function () {
  this.nextElementSibling.value = this.value
  document.documentElement.style.setProperty("--color-secundario", this.value)
})

document.getElementById("colorAcento")?.addEventListener("input", function () {
  this.nextElementSibling.value = this.value
  document.documentElement.style.setProperty("--color-acento", this.value)
})

// Restablecer colores por defecto
function resetearColores() {
  document.getElementById("colorPrimario").value = "#003049"
  document.getElementById("colorSecundario").value = "#023e8a"
  document.getElementById("colorAcento").value = "#669bbc"

  document.documentElement.style.setProperty("--color-primario", "#003049")
  document.documentElement.style.setProperty("--color-secundario", "#023e8a")
  document.documentElement.style.setProperty("--color-acento", "#669bbc")

  mostrarToast("Colores restablecidos a valores por defecto", "success")
}

// Función para mostrar notificaciones toast
function mostrarToast(mensaje, tipo = "success") {
  const toast = document.getElementById("toastNotificacion")
  const toastMensaje = document.getElementById("toastMensaje")

  toastMensaje.textContent = mensaje

  if (tipo === "success") {
    toast.classList.remove("bg-danger")
    toast.classList.add("bg-success")
  } else {
    toast.classList.remove("bg-success")
    toast.classList.add("bg-danger")
  }

  const bsToast = window.bootstrap.Toast.getOrCreateInstance(toast)
  bsToast.show()
}

// Formulario de información de la institución
document.getElementById("formInstitucion")?.addEventListener("submit", (e) => {
  e.preventDefault()

  // Aquí iría la lógica para guardar los datos en el backend
  console.log("[v0] Guardando información de la institución...")

  mostrarToast("Información de la institución guardada exitosamente", "success")
})

// Formulario de usuario y correo
document.getElementById("formUsuario")?.addEventListener("submit", (e) => {
  e.preventDefault()

  const usuario = document.getElementById("nombreUsuario").value
  const email = document.getElementById("emailUsuario").value

  console.log("[v0] Actualizando usuario:", usuario, "email:", email)

  mostrarToast("Usuario y correo actualizados correctamente", "success")
})

// Formulario de cambio de contraseña
document.getElementById("formContrasena")?.addEventListener("submit", function (e) {
  e.preventDefault()

  const contrasenaActual = document.getElementById("contrasenaActual").value
  const contrasenaNueva = document.getElementById("contrasenaNueva").value
  const contrasenaConfirmar = document.getElementById("contrasenaConfirmar").value

  // Validar que la contraseña tenga al menos 8 caracteres
  if (contrasenaNueva.length < 8) {
    mostrarToast("La nueva contraseña debe tener al menos 8 caracteres", "danger")
    return
  }

  // Validar que las contraseñas coincidan
  if (contrasenaNueva !== contrasenaConfirmar) {
    mostrarToast("Las contraseñas no coinciden", "danger")
    return
  }

  console.log("[v0] Cambiando contraseña...")

  // Limpiar campos
  this.reset()

  mostrarToast("Contraseña cambiada exitosamente", "success")
})

// Formulario de personalización
document.getElementById("formPersonalizacion")?.addEventListener("submit", (e) => {
  e.preventDefault()

  const nombrePlataforma = document.getElementById("nombrePlataforma").value
  const eslogan = document.getElementById("eslogan").value
  const colorPrimario = document.getElementById("colorPrimario").value
  const colorSecundario = document.getElementById("colorSecundario").value
  const colorAcento = document.getElementById("colorAcento").value

  console.log("[v0] Guardando personalización:", {
    nombrePlataforma,
    eslogan,
    colorPrimario,
    colorSecundario,
    colorAcento,
  })

  mostrarToast("Personalización guardada exitosamente", "success")
})

// Botón de salir
document.getElementById("logoutButton")?.addEventListener("click", () => {
  if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
    console.log("[v0] Cerrando sesión...")
    window.location.href = "/login"
  }
})
