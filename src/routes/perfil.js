const express = require('express');
const router = express.Router();
const checkAuth = require('../middlewares/checkAuth');
const { obtenerInstitucion, guardarInstitucion, cambiarContrasena, cambiarCorreo, obtenerMulta, guardarMulta } = require('../controllers/perfil');



// Multer para subir el logo
const multer = require('multer');
const path = require('path');

// Configuración del almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'logos'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'logo_' + Date.now() + ext);
  }
});

const upload = multer({ storage });



// Rutas de institución
// Hacer pública la ruta GET /institucion para que el logo se pueda cargar
// desde la vista de login sin requerir autenticación.
router.get('/institucion', obtenerInstitucion);

// Rutas públicas de personalización (permitir que el login cargue nombre/eslogan sin auth)
router.get('/personalizacion', require('../controllers/perfil').obtenerPersonalizacion);

// Middleware global (las rutas siguientes requieren autenticación)
router.use(checkAuth);

// Rutas protegidas de institución (guardar logo requiere auth)
router.post('/institucion', upload.single('logo'), guardarInstitucion);
// Rutas protegidas de personalización (guardar requiere auth)
router.post('/personalizacion', require('../controllers/perfil').guardarPersonalizacion);

// Rutas de usuario
router.post("/cambiar-contrasena", cambiarContrasena);
router.post("/cambiar-correo", cambiarCorreo);
router.get('/usuario', require('../controllers/perfil').obtenerUsuario);


// rutas de multa
router.get('/multa', obtenerMulta);
router.post('/multa', guardarMulta);


// rustas de personalización
router.get('/personalizacion', require('../controllers/perfil').obtenerPersonalizacion);
router.post('/personalizacion', require('../controllers/perfil').guardarPersonalizacion);

// rutas de SMTP
router.post('/smtp', require('../controllers/perfil').guardarSMTP);


module.exports = router;
