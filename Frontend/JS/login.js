document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const mensaje = document.getElementById("mensaje");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita que se recargue la página

    // Capturamos los valores del formulario
    const correo = document.getElementById("correo").value.trim();
    const contrasena = document.getElementById("contrasena").value.trim();

    try {
      // Enviamos los datos al backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // permitir que el navegador guarde la cookie de sesión
        body: JSON.stringify({ correo, contrasena}),
      });

      const data = await response.json();

      // Mostramos mensajes según la respuesta
          if (response.ok) {
        mensaje.classList.remove("text-danger");
        mensaje.classList.add("text-success");
        mensaje.textContent = "Acceso permitido";

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        mensaje.classList.remove("text-success");
        mensaje.classList.add("text-danger");
        mensaje.textContent = data.mensaje || "Credenciales incorrectas";
      }


    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      mensaje.classList.add("text-danger");
      mensaje.textContent = " Error en el servidor";
    }
  });
});

// FUNCION PARA CARGAR LA INFORMACIÓN DEL LOGIN (logo, nombre, eslogan)
async function cargarLoginInfo() {
  try {
    // Intentar cargar personalización (nombrePlataforma, eslogan, logo)
    const res = await fetch("/api/perfil/personalizacion");
    const data = await res.json();

    let info = (data && data.ok && data.data) ? data.data : (data && data.data) ? data.data : null;

    // Si no hay nombrePlataforma, usar la información general de institución (nombre)
    if (!info || !info.nombrePlataforma) {
      try {
        const instResp = await fetch('/api/perfil/institucion');
        const instJson = await instResp.json();
        const institucion = instJson && instJson.data ? instJson.data : null;
        if (institucion) {
          // Usar nombre de la institución para el título si no hay nombrePlataforma
          if (!info) info = {};
          info.nombrePlataforma = info.nombrePlataforma || institucion.nombre || institucion.nombrePlataforma || '';
          // Si no existe logo en personalizacion, usar el logo de institucion
          if (!info.logo && institucion.logo) info.logo = institucion.logo;
          // Si no existe eslogan en personalizacion, no hacemos override (institucion puede no tener eslogan)
        }
      } catch (e) {
        // Silenciar error de consulta de institución
      }
    }

    if (!info) return;

    // LOGO
    if (info.logo) {
      // la ruta de los logos se sirve en /uploads/logos/
      document.getElementById("logoLogin").src = "/uploads/logos/" + info.logo;
    }

    // NOMBRE DE LA PLATAFORMA COMO TÍTULO (prefiere nombrePlataforma, luego nombre)
    if (info.nombrePlataforma) {
      document.getElementById("tituloLogin").textContent = info.nombrePlataforma;
    }

    // ESLOGAN
    if (info.eslogan) {
      document.getElementById("esloganLogin").textContent = info.eslogan;
    }

  } catch (err) {
    console.error("Error cargando datos del login:", err);
  }
}

// FUCTION PARA  VISIBILIDAD DE CONTRASEÑA
const inputPass = document.getElementById("contrasena");
const iconoPass = document.getElementById("iconoContrasena");

iconoPass.addEventListener("click", () => {
    if (inputPass.type === "password") {
        inputPass.type = "text";
        iconoPass.classList.remove("bi-eye-fill");
        iconoPass.classList.add("bi-eye-slash-fill");
    } else {
        inputPass.type = "password";
        iconoPass.classList.remove("bi-eye-slash-fill");
        iconoPass.classList.add("bi-eye-fill");
    }
});

// MODAL DE RECUPERACIÓN DE CONTRASEÑA
const modalRecuperacion = document.getElementById("modalRecuperacion");
const btnOlvideContrasena = document.getElementById("olvideContrasena");
const btnCerrarModal = document.getElementById("cerrarModal");
const formRecuperacion = document.getElementById("formRecuperacion");
const mensajeRecuperacion = document.getElementById("mensajeRecuperacion");

// Abrir modal
btnOlvideContrasena.addEventListener("click", (e) => {
  e.preventDefault();
  modalRecuperacion.style.display = "flex";
  formRecuperacion.reset();
  mensajeRecuperacion.textContent = "";
});

// Cerrar modal
btnCerrarModal.addEventListener("click", () => {
  modalRecuperacion.style.display = "none";
});

// Cerrar modal al hacer click fuera
modalRecuperacion.addEventListener("click", (e) => {
  if (e.target === modalRecuperacion) {
    modalRecuperacion.style.display = "none";
  }
});

// Enviar formulario de recuperación
formRecuperacion.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuarioRecuperacion").value.trim();

  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: usuario }),
    });

    const data = await response.json();

    if (response.ok) {
      mensajeRecuperacion.classList.remove("error");
      mensajeRecuperacion.classList.add("success");
      mensajeRecuperacion.textContent = "✓ " + (data.mensaje || "Contraseña temporal enviada a tu correo");
      
      setTimeout(() => {
        modalRecuperacion.style.display = "none";
        formRecuperacion.reset();
      }, 2000);
    } else {
      mensajeRecuperacion.classList.remove("success");
      mensajeRecuperacion.classList.add("error");
      mensajeRecuperacion.textContent = "✗ " + (data.mensaje || "Error al procesar la solicitud");
    }
  } catch (error) {
    console.error("Error:", error);
    mensajeRecuperacion.classList.remove("success");
    mensajeRecuperacion.classList.add("error");
    mensajeRecuperacion.textContent = "✗ Error en el servidor";
  }
});


cargarLoginInfo();

