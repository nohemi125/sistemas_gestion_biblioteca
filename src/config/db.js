
// ===========CONEXION BD ===========

// src/config/db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'biblioteca'
});

console.log(' Base de datos conectada');

module.exports = db;

