/**
 * Genera una contraseña temporal aleatoria
 * @param {number} length - Longitud de la contraseña (default: 12)
 * @returns {string} - Contraseña aleatoria
 */
const generarContrasenaTemporaria = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let contrasena = '';
  
  for (let i = 0; i < length; i++) {
    contrasena += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return contrasena;
};

module.exports = { generarContrasenaTemporaria };
