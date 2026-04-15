import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

// Función corregida con manejo adecuado de mongoose
const withRetry = async (operation, operationName = "operación", maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${operationName}] Intento ${attempt}/${maxRetries}`);
      
      // Verificar si MongoDB está conectado antes de cada intento - CORREGIDO
      const connectionState = mongoose.connection.readyState;
      console.log(`Estado conexión MongoDB: ${connectionState} (0=desconectado, 1=conectado, 2=conectando, 3=desconectando)`);
      
      if (connectionState !== 1) {
        console.log('MongoDB no está conectado, esperando reconexión...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      const result = await operation();
      console.log(`[${operationName}] Éxito en intento ${attempt}`);
      return result;
      
    } catch (error) {
      lastError = error;
      console.log(`[${operationName}] Intento ${attempt} falló:`, error.message);
      console.log(`Tipo de error: ${error.name}, Código: ${error.code}`);
      
      // Manejar diferentes tipos de errores de conexión
      if ((error.code === 'ECONNRESET' || error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') && attempt < maxRetries) {
        const waitTime = attempt * 2000;
        console.log(`Esperando ${waitTime/1000} segundos antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const signup = async (req, res) => {
  console.log("=== INICIANDO SIGNUP ===");
  const { fullName, email, password } = req.body;

  console.log("Intento de registro:", { fullName, email, password: password ? "***" : "faltante" });

  try {
    // Validaciones básicas
    if (!fullName || !email || !password) {
      console.log("Validación fallida - Campos faltantes");
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    if (password.length < 6) {
      console.log("Validación fallida - Contraseña muy corta");
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Validación fallida - Email inválido");
      return res.status(400).json({ message: "Formato de correo electrónico no válido" });
    }

    console.log("Verificando si el usuario existe...");
    
    // Usar reintento mejorado para la consulta
    const user = await withRetry(() => User.findOne({ email }).maxTimeMS(15000), "User.findOne");
    
    if (user) {
      console.log("Usuario ya existe");
      return res.status(400).json({ message: "El correo electrónico ya existe." });
    }

    console.log("Hasheando contraseña...");
    const salt = await bcrypt.genSalt(8);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("Creando nuevo usuario...");
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    console.log("Guardando usuario en la base de datos...");
    const savedUser = await withRetry(() => newUser.save(), "User.save");
    console.log("Usuario guardado:", savedUser._id);

    console.log("Generando token...");
    generateToken(savedUser._id, res);

    console.log("Enviando respuesta al cliente...");
    res.status(201).json({
      _id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      profilePic: savedUser.profilePic,
    });

    console.log("Registro completado exitosamente");

    // Email en segundo plano (no bloqueante)
    setTimeout(async () => {
      try {
        console.log("Enviando email de bienvenida...");
        await sendWelcomeEmail(savedUser.email, savedUser.fullName, ENV.CLIENT_URL);
        console.log("Email de bienvenida enviado exitosamente");
      } catch (emailError) {
        console.error("Error enviando email (no crítico):", emailError.message);
      }
    }, 0);

  } catch (error) {
    console.log("ERROR FINAL en el controlador de registro:", error.message);
    console.log("Tipo de error:", error.name);
    console.log("Código de error:", error.code);
    console.log("Stack trace:", error.stack);
    
    if (error.code === 'ECONNRESET' || error.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        message: "Problema temporal de conexión con la base de datos. Por favor, intenta de nuevo en unos momentos." 
      });
    }
    
    res.status(500).json({ message: "Error interno del servidor: " + error.message });
  }
};

export const login = async (req, res) => {
  console.log("=== INICIANDO LOGIN ===");
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Se requieren correo electrónico y contraseña." });
  }

  try {
    console.log('Iniciando proceso de login para:', email);
    
    // Usar la función withRetry para el login también
    const user = await withRetry(() => User.findOne({ email }).maxTimeMS(15000), "User.findOne login");
    
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(400).json({ message: "Credenciales no válidas" });
    }

    console.log('Usuario encontrado, verificando contraseña...');
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      console.log('Contraseña inválida');
      return res.status(400).json({ message: "Credenciales no válidas. Inténtelo de nuevo." });
    }

    console.log('Contraseña correcta, generando token...');
    generateToken(user._id, res);

    console.log('Login exitoso para:', email);
    
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Error en el controlador de login:", error.message);
    
    // Manejar ECONNRESET específicamente con respuesta adecuada
    if (error.code === 'ECONNRESET' || error.name === 'MongoNetworkError') {
      console.log('Error de conexión con la base de datos durante el login');
      return res.status(503).json({ 
        message: "Problema temporal con la base de datos. Por favor, intenta de nuevo." 
      });
    }
    
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const logout = (req, res) => {
  try {
    console.log('Cerrando sesión del usuario...');
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Sesión cerrada exitosamente" });
    console.log('Cierre de sesión exitoso');
  } catch (error) {
    console.error("Error en el controlador de logout:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ message: "Se requiere foto de perfil" });

    const userId = req.user._id;

    console.log('Actualizando foto de perfil para el usuario:', userId);
    const uploadResponse = await cloudinary.uploader.upload(profilePic);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    console.log('Perfil actualizado exitosamente');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};