const dbConection = require('../db')



//funcion para listar todas las brigadas disponibles
async function getBrigadas(req, res) {
  const { periodoAcademico } = req.query;

  if (!periodoAcademico) {
    return res.status(400).json({ error: 'El periodo académico es requerido' });
  }

  try {
    const db = dbConection.get() // Obtén la base de datos
    const database = db.db('Brigadas')
    const brigadasCollection = database.collection('data'); // Colección de brigadas

    // Consulta las brigadas del periodo académico
    const brigadas = await brigadasCollection.find({ periodoAcademico }).toArray();

    res.status(200).json(brigadas);
  } catch (error) {
    console.error('Error al obtener las brigadas:', error);
    res.status(500).json({ error: 'Error al obtener las brigadas' });
  }
};

async function getBrigadasDisponibles(req, res) {
  const { periodoAcademico } = req.query;
  if (!periodoAcademico) {
    return res.status(400).json({ error: 'El periodo académico es requerido' });
  }
  try {
    const db = dbConection.get();
    const database = db.db('Brigadas');
    const brigadasCollection = database.collection('data');

    // Consulta las brigadas con cupos disponibles
    const brigadas = await brigadasCollection.find({
      periodoAcademico,
      $where: "this.usuarios.length < 3"
    }).toArray();

    res.status(200).json(brigadas);
  } catch (error) {
    console.error('Error al obtener las brigadas disponibles:', error);
    res.status(500).json({ error: 'Error al obtener las brigadas disponibles' });


  }  

}

//funcion para seleccionar una brigada

async function selectBrigadas(req, res) {
  const { usuario_id, brigada_ids, periodoAcademico } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ error: 'El usuario es requerido.' });
  }

  if (!brigada_ids || !Array.isArray(brigada_ids)) {
    return res.status(400).json({ error: 'Las brigadas son requeridas y deben ser un arreglo.' });
  }

  if (brigada_ids.length !== 2) {
    return res.status(400).json({ error: 'Debe seleccionar dos brigadas obligatoriamente.' });
  }

  if (!periodoAcademico) {
    return res.status(400).json({ error: 'El periodo académico es requerido.' });
  }

  try {
    // Utilizar la conexión a la base de datos ya existente
    const db = dbConection.get();
    const database = db.db('Brigadas');
    const brigadasCollection = database.collection('data');
    const usuariosCollection = db.db('Usuarios').collection('data');

    // Verificar si el usuario existe
    const usuario = await usuariosCollection.findOne({ usuario_id });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no registrado' });
    }

    // Verificar si el usuario ya está registrado en alguna de las brigadas seleccionadas
    let brigadasYaRegistradas = [];
    for (let brigada_id of brigada_ids) {
      const brigada = await brigadasCollection.findOne({ brigada_id, periodoAcademico });

      if (!brigada) {
        return res.status(404).json({ error: `La brigada ${brigada_id} no existe para el periodo académico ${periodoAcademico}` });
      }

      if (brigada.usuarios.includes(usuario_id)) {
        brigadasYaRegistradas.push(brigada_id);
      }
    }

    if (brigadasYaRegistradas.length > 0) {
      return res.status(400).json({
        error: `El usuario ya está registrado en la(s) brigada(s): ${brigadasYaRegistradas.join(', ')}`
      });
    }

    // Verificar y actualizar las brigadas de forma segura
    let brigadasSinCupos = [];
    for (let brigada_id of brigada_ids) {
      const brigada = await brigadasCollection.findOne({ brigada_id, periodoAcademico });

      if (brigada.usuarios.length >= 3) {
        brigadasSinCupos.push(brigada_id);
      }
    }

    if (brigadasSinCupos.length > 0) {
      return res.status(400).json({
        error: `No hay cupos disponibles en la(s) brigada(s): ${brigadasSinCupos.join(', ')}`
      });
    }

    // Actualizar las brigadas añadiendo el usuario
    for (let brigada_id of brigada_ids) {
      await brigadasCollection.updateOne(
        { brigada_id: brigada_id, periodoAcademico: periodoAcademico },
        { $push: { usuarios: usuario_id } }
      );
    }

    // Actualizar el usuario con las brigadas seleccionadas
    await usuariosCollection.updateOne(
      { usuario_id },
      { $set: { brigadas: brigada_ids } }
    );

    res.status(200).json({ message: 'Brigadas seleccionadas exitosamente' });
  } catch (error) {
    console.error('Error al seleccionar brigadas:', error);
    res.status(500).json({ error: 'Error al seleccionar brigadas' });
  }
}


//funcion para que un usuario ueda ver sus brigadas seleccionadas

async function getUsuariosBrigadas(req, res) {
  const { usuario_id } = req.params;

  if (!usuario_id) {
    return res.status(400).json({ error: 'El usuario es requerido.' });
  }

  try {
    // Utilizar la conexión a la base de datos ya existente
    const db = dbConection.get();
    const usuariosCollection = db.db('Usuarios').collection('data');
    const brigadasCollection = db.db('Brigadas').collection('data');

    // Verificar si el usuario existe
    const usuario = await usuariosCollection.findOne({ usuario_id });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no registrado' });
    }

    if (!usuario.brigadas || usuario.brigadas.length === 0) {
      return res.status(404).json({ error: 'El usuario no está registrado en ninguna brigada' });
    }

    // Obtener información de las brigadas a las que pertenece el usuario
    const brigadas = await brigadasCollection.find({ brigada_id: { $in: usuario.brigadas } }).project({ nombre: 1, actividad: 1, diaSemana: 1, _id: 0 }).toArray();

    res.status(200).json(brigadas);
  } catch (error) {
    console.error('Error al obtener las brigadas del usuario:', error);
    res.status(500).json({ error: 'Error al obtener las brigadas del usuario' });
  }
}


//funcion ppara ver los estudiantes que pertenecen a una brigada:
async function getBrigadaEstudiantes(req, res) {
  const { brigada_id, periodoAcademico } = req.query;

  if (!brigada_id || !periodoAcademico) {
    return res.status(400).json({ error: 'Brigada y periodo académico son requeridos.' });
  }

  try {
    // Utilizar la conexión a la base de datos ya existente
    const db = dbConection.get();
    const brigadasCollection = db.db('Brigadas').collection('data');

    // Verificar si la brigada existe y obtener los usuarios registrados
    const brigada = await brigadasCollection.findOne({ brigada_id, periodoAcademico });

    if (!brigada) {
      return res.status(404).json({ error: 'La brigada no existe para el periodo académico indicado.' });
    }
   

    const usuariosCollection = db.db('Usuarios').collection('data');
    const estudiantes = await usuariosCollection.find({ usuario_id: { $in: brigada.usuarios } }).project({ nombre: 1, usuario_id: 1, _id: 0 }).toArray();

    if (estudiantes.length === 0) {
      return res.status(404).json({ error: 'No existen estudiantes registrados en esta brigada.' });
    }

    res.status(200).json(estudiantes);
  } catch (error) {
    console.error('Error al obtener los estudiantes de la brigada:', error);
    res.status(500).json({ error: 'Error al obtener los estudiantes de la brigada' });
  }
}

async function completarTarea(req, res) {
  const { tarea_id, asistentes, evidencia, observacion } = req.body;

  if (!tarea_id || !asistentes || !Array.isArray(asistentes) || !observacion) {
    return res.status(400).json({ error: 'Tarea, asistentes (array), evidencia y descripción son requeridos.' });
  }

  try {
    // Utilizar la conexión a la base de datos ya existente
    const db = dbConection.get();
    const tareasCollection = db.db('Tareas').collection('data');

    // Verificar si la tarea existe
    const tarea = await tareasCollection.findOne({ tarea_id });

    if (!tarea) {
      return res.status(404).json({ error: 'La tarea no existe.' });
    }

    // Permitir completar la tarea solo si el estado es 'por completar'
    if (tarea.estado !== 'por completar') {
      return res.status(400).json({ error: 'La tarea no está en estado para completar.' });
    }

    // Actualizar la tarea con los asistentes, la evidencia y la observación, y marcarla como completada
    await tareasCollection.updateOne(
      { tarea_id },
      {
        $set: {
          asistentes: asistentes,
          evidencia_id: evidencia,
          observacion: observacion,
          estado: 'completada'
        }
      }
    );

    res.status(200).json({ message: 'Tarea completada exitosamente' });
  } catch (error) {
    console.error('Error al completar la tarea:', error);
    res.status(500).json({ error: 'Error al completar la tarea' });
  }
}

async function getTareasPorBrigada(req, res) {
  const { usuario_id, periodoAcademico } = req.query;

  if (!usuario_id || !periodoAcademico) {
    return res.status(400).json({ error: 'Usuario y periodo académico son requeridos.' });
  }

  try {
    // Utilizar la conexión a la base de datos ya existente
    const db = dbConection.get();
    const usuariosCollection = db.db('Usuarios').collection('data');
    const tareasCollection = db.db('Tareas').collection('data');

    // Verificar si el usuario existe
    const usuario = await usuariosCollection.findOne({ usuario_id });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no registrado' });
    }

    if (!usuario.brigadas || usuario.brigadas.length === 0) {
      return res.status(404).json({ error: 'Debe escoger una brigada para poder ver las tareas.' });
    }

    // Obtener las tareas asociadas a las brigadas del usuario y filtrar por el periodo académico
    const tareas = await tareasCollection.find({
      brigada_id: { $in: usuario.brigadas },
      periodoAcademico: periodoAcademico
    }).project({ tarea_id: 1, brigada_id: 1, descripcion: 1, fecha: 1, estado: 1, _id: 0 }).toArray();

    res.status(200).json(tareas);
  } catch (error) {
    console.error('Error al obtener las tareas de la brigada del usuario:', error);
    res.status(500).json({ error: 'Error al obtener las tareas de la brigada del usuario' });
  }
}

// Función para obtener la información completa de una tarea ya completada
async function getTareaCompletada(req, res) {
  const { tarea_id } = req.params;

  if (!tarea_id) {
    return res.status(400).json({ error: 'El ID de la tarea es requerido.' });
  }

  try {
    // Utilizar la conexión a la base de datos ya existente
    const db = dbConection.get();
    const tareasCollection = db.db('Tareas').collection('data');
    const usuariosCollection = db.db('Usuarios').collection('data');

    // Verificar si la tarea existe y ha sido completada
    const tarea = await tareasCollection.findOne({ tarea_id, estado: 'completada' });

    if (!tarea) {
      return res.status(404).json({ error: 'La tarea no existe o no está completada.' });
    }

    // Obtener información de los asistentes (solo los que asistieron)
    const asistentesInfo = await usuariosCollection.find({ usuario_id: { $in: tarea.asistentes } }).project({ nombre: 1, usuario_id: 1, _id: 0 }).toArray();

    // Armar la respuesta con la información detallada de la tarea
    const tareaCompleta = {
      tarea_id: tarea.tarea_id,
      brigada_id: tarea.brigada_id,
      descripcion: tarea.descripcion,
      observacion: tarea.observacion,
      fecha: tarea.fecha,
      estado: tarea.estado,
      asistentes: asistentesInfo,
      evidencia: tarea.evidencia_id // Imagen en Base64
      
    };

    res.status(200).json(tareaCompleta);
  } catch (error) {
    console.error('Error al obtener la información de la tarea completada:', error);
    res.status(500).json({ error: 'Error al obtener la información de la tarea completada' });
  }
}








module.exports = {
  getBrigadas, getBrigadasDisponibles, selectBrigadas, getUsuariosBrigadas, completarTarea,getTareasPorBrigada,getBrigadaEstudiantes
  ,getTareaCompletada
}