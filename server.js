const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 3001;
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const cors = require('cors');

app.use(cors());

// Configuración de la base de datos SQLite
let db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Conectado a la base de datos SQLite.');
});

// Middleware para parsear JSON
app.use(express.json());

// Crear tabla de usuarios si no existe
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT,
  lastName TEXT,
  companyName TEXT,
  phone TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT
)`);

// Crear tabla de clientes si no existe
db.run(`CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT,
  lastName TEXT,
  phone TEXT,
  email TEXT,
  userId INTEGER,
  FOREIGN KEY(userId) REFERENCES users(id)
)`);

// Crear tabla de documentos si no existe
db.run(`CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  status TEXT,
  reason TEXT,
  clientId INTEGER,
  FOREIGN KEY(clientId) REFERENCES clients(id)
)`);

// Ruta de registro con validación
app.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { firstName, lastName, companyName, phone, email, password } = req.body;
  const role = 'ADMIN';
  const query = `INSERT INTO users (firstName, lastName, companyName, phone, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [firstName, lastName, companyName, phone, email, password, role], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Error al registrar usuario' });
    }
    res.json({ message: 'Registro exitoso', userId: this.lastID });
  });
});

// Ruta de inicio de sesión con JWT
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

  db.get(query, [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = jwt.sign({ userId: row.id, role: row.role }, 'secret_key', { expiresIn: '1h' });
    res.json({ message: 'Inicio de sesión exitoso', token });
  });
});

// Middleware para verificar JWT
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Ruta para crear un archivo de cliente
app.post('/clients', authenticateToken, (req, res) => {
  const { firstName, lastName, phone, email, userId } = req.body;
  const query = `INSERT INTO clients (firstName, lastName, phone, email, userId) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [firstName, lastName, phone, email, userId], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Error al crear cliente' });
    }
    res.json({ message: 'Cliente creado exitosamente', clientId: this.lastID });
  });
});

// Ruta para obtener todos los clientes de un usuario
app.get('/clients/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `SELECT * FROM clients WHERE userId = ?`;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener clientes' });
    }
    res.json({ clients: rows });
  });
});

// Ruta para subir un documento
app.post('/documents', authenticateToken, (req, res) => {
  const { name, clientId } = req.body;
  const status = 'pending'; // Estado inicial del documento
  const query = `INSERT INTO documents (name, status, clientId) VALUES (?, ?, ?)`;

  db.run(query, [name, status, clientId], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Error al subir documento' });
    }
    res.json({ message: 'Documento subido exitosamente', documentId: this.lastID });
  });
});

// Ruta para aprobar un documento
app.post('/documents/:id/approve', (req, res) => {
  const { id } = req.params;
  const query = `UPDATE documents SET status = 'approved', reason = NULL WHERE id = ?`;

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Error al aprobar documento' });
    }
    res.json({ message: 'Documento aprobado' });
  });
});

// Ruta para rechazar un documento
app.post('/documents/:id/reject', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const query = `UPDATE documents SET status = 'rejected', reason = ? WHERE id = ?`;

  db.run(query, [reason, id], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Error al rechazar documento' });
    }
    res.json({ message: 'Documento rechazado' });
  });
});

// Ruta para obtener documentos de un cliente
app.get('/clients/:clientId/documents', (req, res) => {
  const { clientId } = req.params;
  const query = `SELECT * FROM documents WHERE clientId = ?`;

  db.all(query, [clientId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener documentos' });
    }
    res.json({ documents: rows });
  });
});

// Servir archivos estáticos
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
}); 