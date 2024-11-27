var express = require('express');
var studentController = require('../controllers/student')
var router = express.Router();
// Ruta para obtener brigadas por periodo académico
router.get('/brigadas', studentController.getBrigadas);

router.get('/brigadas/disponibles', studentController.getBrigadasDisponibles);

// Ruta para seleccionar brigadas
router.post('/brigadas/seleccionar', studentController.selectBrigadas);


module.exports = router;