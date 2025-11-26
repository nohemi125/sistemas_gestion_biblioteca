// Cargar variables de entorno
require('dotenv').config();

// Importar módulos
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require('express-session');

// Importar conexión a la base de datos
const db = require("./src/config/db"); 

// Inicializar la app
const app = express();

// Configuración de express-session (necesario para usar req.session.destroy)
app.use(session({
    secret: 'tu_secreto_de_sesion_seguro', 
    resave: false,
    saveUninitialized: false,
    // ...otras opciones
}));

function noCache(req, res, next) {
    // Estas cabeceras fuerzan al navegador a no almacenar la página.
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0'); // Para navegadores más antiguos
    next();
}

app.use(noCache);

// Middlewares
app.use(cors());
// Aumentar el límite para permitir enviar imágenes en data URLs desde el frontend
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos 
app.use(express.static(path.join(__dirname, "Frontend")));

// Servir uploads (logos) guardados por multer: src/public/logos -> /uploads/logos/...
app.use('/uploads', express.static(path.join(__dirname, 'src', 'public')));

// Importar rutas 
const authRoutes = require("./src/routes/auth");
const librosRoutes = require("./src/routes/libros");
const miembrosRoutes = require('./src/routes/miembros');
const prestamosRoutes = require("./src/routes/prestamos");
const emailsRoutes = require("./src/routes/emails");
const beneficiosRoutes = require("./src/routes/beneficios");
const perfilRoutes = require('./src/routes/perfil');

// Middleware de autenticación
const checkAuth = require('./src/middlewares/checkAuth');

// Rutas de API
app.use("/api/auth", authRoutes);
app.use("/api/libros", librosRoutes);
app.use('/api/miembros', miembrosRoutes);
app.use("/api/prestamos", prestamosRoutes);
app.use("/api/emails", emailsRoutes);
app.use("/api/beneficios", beneficiosRoutes);
app.use('/api/perfil', perfilRoutes);




// Rutas para las páginas HTML
app.get("/", (req, res) => {
    res.redirect("/login"); 
});

app.get("/login", (req, res) => { 
    res.sendFile(path.join(__dirname, "Frontend", "HTML", "login.html"));
});

app.get("/dashboard", checkAuth, (req, res) => { 
    res.sendFile(path.join(__dirname, "Frontend", "HTML", "dashboard.html"));
});

app.get("/libros", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "Frontend", "HTML", "libros.html"));
});

// Ruta para la vista de miembros
app.get("/miembros", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "Frontend", "HTML", "miembros.html"));
});

// Ruta para la vista de préstamos
app.get("/prestamos", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "Frontend", "HTML", "prestamos.html"));
});

app.get("/perfil", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "Frontend", "HTML", "perfil.html"));
});

// Puerto
const PORT = 3000;

// Iniciar WhatsApp Web al arrancar para mostrar QR en consola (sesión LocalAuth)
const { iniciarWhatsApp } = require('./src/services/whatsapp');
iniciarWhatsApp().catch(err => console.error('No se pudo iniciar WhatsApp al arrancar:', err));

app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
