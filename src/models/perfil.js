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





// PERSONALIZACION 
const obtenerPersonalizacion = async () => {
  const [rows] = await db.query(`SELECT nombrePlataforma, eslogan, colorPrimario, colorSecundario, colorAcento, logo FROM institucion LIMIT 1`);
  return rows[0];
};

const guardarPersonalizacion = async (data) => {
  // Verificar si ya existe una fila en la tabla 'institucion'
  const [rows] = await db.query('SELECT id_institucion FROM institucion LIMIT 1');
  const params = [
    data.nombrePlataforma || null,
    data.eslogan || null,
    data.colorPrimario || null,
    data.colorSecundario || null,
    data.colorAcento || null
  ];

  if (rows && rows.length > 0) {
    // Actualizar la fila existente usando la clave real id_institucion
    const id = rows[0].id_institucion || rows[0].id;
    const sql = `
      UPDATE institucion
      SET nombrePlataforma = ?, eslogan = ?, colorPrimario = ?, colorSecundario = ?, colorAcento = ?
      WHERE id_institucion = ?
    `;
    await db.query(sql, params.concat([id]));
    return { id_institucion: id, ...data };
  } else {
    // Insertar una nueva fila si no existe
    const insertSql = `
      INSERT INTO institucion (nombrePlataforma, eslogan, colorPrimario, colorSecundario, colorAcento)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(insertSql, params);
    return { id_institucion: result.insertId, ...data };
  }
};

// Guardar configuración SMTP (proveedor, host, puerto, correo, contrasena)
Institucion.guardarSMTP = async function(data) {
  const existente = await Institucion.obtenerInstitucion();
  if (existente) {
    const id = existente.id_institucion || existente.id;
    await db.query(
      'UPDATE institucion SET smtp_proveedor = ?, smtp_host = ?, smtp_puerto = ?, smtp_correo = ?, smtp_contrasena = ? WHERE id_institucion = ?',
      [data.smtpProveedor || null, data.smtpHost || null, data.smtpPuerto || null, data.smtpCorreo || null, data.smtpContrasena || null, id]
    );
    return { id_institucion: id, ...data };
  } else {
    const [result] = await db.query(
      'INSERT INTO institucion (smtp_proveedor, smtp_host, smtp_puerto, smtp_correo, smtp_contrasena) VALUES (?, ?, ?, ?, ?)',
      [data.smtpProveedor || null, data.smtpHost || null, data.smtpPuerto || null, data.smtpCorreo || null, data.smtpContrasena || null]
    );
    return { id_institucion: result.insertId, ...data };
  }
};



// Configuración SMTP
const SMTP = {

  async obtenerConfig() {
    const [rows] = await db.query("SELECT smtp_proveedor, smtp_correo, smtp_contrasena, smtp_host, smtp_puerto FROM institucion LIMIT 1");
    return rows[0] || null;
  },

  async guardarConfig(data) {
    // Ver si ya existe un registro en la tabla institucion
    const [rows] = await db.query("SELECT id_institucion FROM institucion LIMIT 1");

    // Normalizar puerto: convertir a número o dejar NULL si viene vacío
    const puertoVal = data && data.puerto ? Number(data.puerto) : null;
    if (rows.length > 0) {
      // actualizar
      await db.query(`
        UPDATE institucion
        SET smtp_proveedor=?, smtp_correo=?, smtp_contrasena=?, smtp_host=?, smtp_puerto=?
        WHERE id_institucion=?
      `, [
        data.proveedor,
        data.correo,
        data.contrasena,
        data.host,
        puertoVal,
        rows[0].id_institucion
      ]);

      return { id_institucion: rows[0].id_institucion, ...data };
    }

    // si no existe, insertar
    const [result] = await db.query(`
      INSERT INTO institucion (smtp_proveedor, smtp_correo, smtp_contrasena, smtp_host, smtp_puerto)
      VALUES (?, ?, ?, ?, ?)
    `, [
      data.proveedor,
      data.correo,
      data.contrasena,
      data.host,
      puertoVal
    ]);

    return { id_institucion: result.insertId, ...data };
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
  guardarMulta: Multa.guardarMulta,
  obtenerPersonalizacion,
  guardarPersonalizacion,
  guardarSMTP: Institucion.guardarSMTP,
  obtenerSMTP: SMTP.obtenerConfig,
  guardarSMTP: SMTP.guardarConfig

};
