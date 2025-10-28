const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Result = require('./models/Result');

const app = express();

app.use(cors({
  origin: "https://autocuidado-personal.netlify.app", // tu dominio frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// Conexión MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(" Conectado a MongoDB"))
  .catch(err => console.error(" Error al conectar:", err));

// Middleware de autenticación
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, birthdate } = req.body;

    console.log(" Datos recibidos:", req.body); 

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Usuario ya existe:", email);
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    console.log("Contraseña encriptada");

    const newUser = new User({ username, email, password: hashed, birthdate });
    await newUser.save();

    console.log("Usuario guardado:", newUser._id);
    res.json({ message: 'Registro exitoso. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error("Error en /api/register:", err.message);
    console.error(err.stack);
    res.status(500).json({ message: 'Error al registrar usuario', error: err.message });
  }
});


// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado. ¿Deseas registrarte?' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ message: 'Login exitoso', token });
  } catch (err) {
    res.status(500).json({ message: 'Error al iniciar sesión', err });
  }
});

// Verificar si el usuario ya respondió
app.get('/api/survey/status', verifyToken, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ hasCompletedSurvey: user.hasCompletedSurvey });
});

// Guardar resultado (una sola vez)
app.post('/api/survey/save', verifyToken, async (req, res) => {
  const { score, level, recommendation } = req.body;
  const user = await User.findById(req.userId);

  if (user.hasCompletedSurvey) {
    return res.status(400).json({ message: 'Ya has completado la encuesta una vez.' });
  }

  const result = new Result({ userId: req.userId, score, level, recommendation });
  await result.save();

  user.hasCompletedSurvey = true;
  await user.save();

  res.json({ message: 'Encuesta registrada exitosamente.' });
});

// Obtener estadísticas globales (nivel vs edad)
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const results = await Result.find().populate('userId', 'birthdate');
    const currentYear = new Date().getFullYear();

    // Calcular edad y agrupar por nivel
    const stats = results.map(r => ({
      level: r.level,
      age: currentYear - new Date(r.userId.birthdate).getFullYear()
    }));

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));


