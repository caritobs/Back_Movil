const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const routes = require('./routes/routes');

// Usa el middleware de CORS
app.use(cors());
app.options('*', cors()); // Esto es necesario para manejar las peticiones OPTIONS

// Configuración de body-parser con límites aumentados
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Rutas
app.use('', routes);

module.exports = app;