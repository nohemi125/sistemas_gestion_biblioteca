// src/middlewares/checkAuth.js

const checkAuth = (req, res, next) => {
   

    // Si la sesión fue destruida, req.session.isAuthenticated será undefined o no existirá.
    if (req.session && req.session.isAuthenticated === true) { 
        console.log('CheckAuth - Usuario autenticado');
        return next(); 
    } else {
        console.log('CheckAuth - Usuario NO autenticado');
        // Detectar correctamente si la petición es a la API.
        const isApiRequest = (req.originalUrl && req.originalUrl.startsWith('/api/')) || (req.baseUrl && req.baseUrl.startsWith('/api/'));

        // Para peticiones API, devolvemos 401 Unauthorized
        if (isApiRequest) {
            return res.status(401).json({ 
                autenticado: false, 
                mensaje: "No autorizado" 
            });
        }
        // Para peticiones de página web, redirigimos al login
        else {
            return res.redirect('/login');
        }
    }
};

module.exports = checkAuth;