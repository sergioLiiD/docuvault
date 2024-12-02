const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 3000;

// Configuración de la base de datos SQLite
let db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Conectado a la base de datos SQLite.');
});

// Middleware para parsear JSON
app.use(express.json());

// Ruta de registro
app.post('/register', (req, res) => {
  const { firstName, lastName, companyName, phone, email, password } = req.body;
  // Lógica para guardar en la base de datos
  res.json({ message: 'Registro exitoso' });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
}); 