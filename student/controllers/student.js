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



module.exports = {
  getBrigadas, getBrigadasDisponibles, selectBrigadas
}