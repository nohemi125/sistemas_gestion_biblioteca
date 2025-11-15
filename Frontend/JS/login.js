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
