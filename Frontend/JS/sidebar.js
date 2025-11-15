    document.addEventListener('DOMContentLoaded', async function() {
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include', 
                headers: {
                    'Accept': 'application/json'
                }
            });
        
            
            if (!response.ok) {
                // Redirigir a la ruta del servidor para login
                window.location.replace('/login');
                return;
            }
        } catch (error) {
            window.location.replace('/login');
            return;
        }

        // Cargar el sidebar (solo el HTML del menú lateral)
                // Asumimos que cada vista incluye el markup del sidebar inline.
                // Si quieres usar un partial en el futuro, puedes reactivar la
                // lógica de fetch. Aquí solo comprobamos que el contenedor exista
                // y emitimos una advertencia si está vacío.
                const sidebarContainer = document.getElementById('sidebar-container');
                if (!sidebarContainer) {
                    console.warn('No se encontró #sidebar-container en la página. Asegúrate de incluir el HTML del sidebar en cada vista.');
                } else if (sidebarContainer.innerHTML.trim().length === 0) {
                    console.warn('#sidebar-container está vacío. Incluye el HTML del sidebar en la vista para que los enlaces funcionen.');
                }


            const currentPage = window.location.pathname.split('/').pop();

            document.querySelectorAll('#sidebar-container .nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
                

        const logoutButton = document.getElementById('logoutButton');

        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                // 1. Envía la petición POST al servidor
                try {
                    const response = await fetch("/api/auth/logout", {
                        method: 'POST', 
                        credentials: 'include', // importante para enviar cookie de sesión
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    // 2. Maneja la respuesta del servidor
                    if (response.ok) {
                        // Limpiar el historial y redirigir al login
                        sessionStorage.clear();
                        localStorage.clear();
                        // Usar la ruta del servidor definida en app.js
                        window.location.href = '/login';
                        history.pushState(null, '', '/login');
                    } else {
                        // El servidor falló en cerrar la sesión (p.ej., 500 Internal Server Error)
                        alert('Error al cerrar sesión. Inténtalo de nuevo.');
                        console.error('Logout failed with status:', response.status);
                    }
                } catch (error) {
                    // Error de red (p.ej., servidor caído)
                    alert('Ocurrió un error de conexión. Verifica el servidor.');
                    console.error('Network error during logout:', error);
                }
            });
        }
         document.body.style.visibility = 'visible';
    });
