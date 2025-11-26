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



// Middleware global
router.use(checkAuth);

// Rutas de institución
router.get('/institucion', obtenerInstitucion);
router.post('/institucion', upload.single('logo'), guardarInstitucion);

// Rutas de usuario
router.post("/cambiar-contrasena", cambiarContrasena);
router.post("/cambiar-correo", cambiarCorreo);
router.get('/usuario', require('../controllers/perfil').obtenerUsuario);


// rutas de multa
router.get('/multa', obtenerMulta);
router.post('/multa', guardarMulta);

module.exports = router;
