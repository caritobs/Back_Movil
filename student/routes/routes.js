var express = require('express');
var studentController = require('../controllers/student')
var router = express.Router();
// Ruta para obtener brigadas por periodo académico
router.get('/brigadas', studentController.getBrigadas);

router.get('/brigadas/disponibles', studentController.getBrigadasDisponibles);

// Ruta para seleccionar brigadas
router.post('/brigadas/seleccionar', studentController.selectBrigadas);

//ruta para ver las brigadas a la sque pertenece un usuario
router.get('/usuarios/:usuario_id/brigadas', studentController.getUsuariosBrigadas);

// Ruta para obtener los estudiantes de una brigada específica
router.get('/brigada/estudiantes', studentController.getBrigadaEstudiantes);

// Ruta para completar una tarea
router.post('/tareas/completar', studentController.completarTarea);

// Ruta para obtener las tareas de las brigadas del usuario en el periodo académico indicado
router.get('/tareas/brigada', studentController.getTareasPorBrigada);

//ruta para ver una tarea completada
router.get('/tareas/completada/:tarea_id', studentController.getTareaCompletada);

module.exports = router;