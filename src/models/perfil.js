const db = require('../config/db');

const Institucion = {
  async obtenerInstitucion() {
    const [rows] = await db.query('SELECT * FROM institucion LIMIT 1');
    return rows[0] || null;
  },

  async crearInstitucion(data) {
    const { nombre, telefono, direccion, logo } = data;
    const [result] = await db.query(
      'INSERT INTO institucion (nombre, telefono, direccion, logo) VALUES (?, ?, ?, ?)',
      [nombre, telefono, direccion, logo]
    );
    // devolver objeto con id y campos
    return { id: result.insertId, nombre, telefono, direccion, logo };
  },

  async actualizarInstitucion(id, data) {
    const { nombre, telefono, direccion, logo } = data;
    await db.query(
      'UPDATE institucion SET nombre=?, telefono=?, direccion=?, logo=? WHERE id_institucion=?',
      [nombre, telefono, direccion, logo, id]
    );
    return { id, nombre, telefono, direccion, logo };
  }
};

// guardarInstitucion acepta un objeto { nombre, telefono, direccion, logo }
Institucion.guardarInstitucion = async function(payload) {
  const { nombre, telefono, direccion, logo } = payload || {};
  const existente = await Institucion.obtenerInstitucion();
  if (existente) {
    const id = existente.id_institucion || existente.id;
    const data = {
      nombre: nombre != null ? nombre : existente.nombre,
      telefono: telefono != null ? telefono : existente.telefono,
      direccion: direccion != null ? direccion : existente.direccion,
      logo: logo != null ? logo : existente.logo
    };
    await Institucion.actualizarInstitucion(id, data);
    return { id, ...data };
  } else {
    const data = { nombre: nombre || null, telefono: telefono || null, direccion: direccion || null, logo: logo || null };
    const created = await Institucion.crearInstitucion(data);
    return created;
  }
};

const Usuario = {
  async obtenerUsuarioPorId(id) {
    const [results] = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    return results[0];
  },

  async actualizarCorreo(id, nuevoCorreo) {
    const [results] = await db.query('UPDATE usuarios SET correo = ? WHERE id = ?', [nuevoCorreo, id]);
    return results;
  },

  async actualizarContrasena(id, nuevaContrasena) {
    const [results] = await db.query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [nuevaContrasena, id]);
    return results;
  }
  ,
  async actualizarNombre(id, nuevoNombre) {
    const [results] = await db.query('UPDATE usuarios SET nombre = ? WHERE id = ?', [nuevoNombre, id]);
    return results;
  }
};
// Obtener configuración de multa
const Multa = {
  async obtenerMulta() {
    const [rows] = await db.query("SELECT * FROM institucion LIMIT 1");
    return rows[0] || null;
  },

  async guardarMulta(data) {
    const existente = await this.obtenerMulta();

    if (existente) {
      // Actualizar EXISTENTE
      const { valor_multa, dias_tolerancia } = data;

      await db.query(
        "UPDATE institucion SET valor_multa = ?, dias_tolerancia = ? WHERE id_institucion = ?",
        [valor_multa, dias_tolerancia, existente.id_institucion]  // <-- CORREGIDO
      );

      return { id_institucion: existente.id_institucion, ...data };
    } else {
      // Crear SI NO EXISTE
      const { valor_multa, dias_tolerancia } = data;

      const [result] = await db.query(
        "INSERT INTO institucion (valor_multa, dias_tolerancia) VALUES (?, ?)",
        [valor_multa, dias_tolerancia]
      );

      return { id_institucion: result.insertId, ...data };
    }
  }
};



// Exportar funciones individuales para compatibilidad con controllers
module.exports = {
  obtenerInstitucion: Institucion.obtenerInstitucion,
  crearInstitucion: Institucion.crearInstitucion,
  actualizarInstitucion: Institucion.actualizarInstitucion,
  guardarInstitucion: Institucion.guardarInstitucion,
  obtenerUsuarioPorId: Usuario.obtenerUsuarioPorId,
  actualizarCorreo: Usuario.actualizarCorreo,
  actualizarContrasena: Usuario.actualizarContrasena ,
  actualizarNombre: Usuario.actualizarNombre,
  obtenerMulta: Multa.obtenerMulta,
  guardarMulta: Multa.guardarMulta
};
