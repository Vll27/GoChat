import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const withRetry = async (operation, operationName = "operación", maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${operationName}] Intento ${attempt}/${maxRetries}`);
      
      const connectionState = mongoose.connection.readyState;
      console.log(`Estado conexión MongoDB: ${connectionState}`);
      
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
  const { fullName, email, password, token_acceso } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Formato de correo electrónico no válido" });
    }

    const user = await withRetry(() => User.findOne({ email }).maxTimeMS(15000), "User.findOne");
    
    if (user) {
      return res.status(400).json({ message: "El correo electrónico ya existe." });
    }

    if (token_acceso) {
      const existingToken = await User.findOne({ token_acceso });
      if (existingToken) {
        return res.status(409).json({ message: "El token de acceso ya está en uso." });
      }
    }

    const salt = await bcrypt.genSalt(8);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      token_acceso: token_acceso || undefined,
      lastSeen: new Date(),
      lastSeenStatus: "offline",
    });

    const savedUser = await withRetry(() => newUser.save(), "User.save");

    generateToken(savedUser._id, res);

    res.status(201).json({
      _id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      profilePic: savedUser.profilePic,
    });

    setTimeout(async () => {
      try {
        await sendWelcomeEmail(savedUser.email, savedUser.fullName, ENV.CLIENT_URL);
      } catch (emailError) {
        console.error("Error enviando email (no crítico):", emailError.message);
      }
    }, 0);

  } catch (error) {
    console.log("ERROR FINAL en el controlador de registro:", error.message);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "El token de acceso ya está en uso. Por favor, use otro." 
      });
    }
    
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
    
    const user = await withRetry(() => User.findOne({ email }).maxTimeMS(15000), "User.findOne login");
    
    if (!user) {
      return res.status(400).json({ message: "Credenciales no válidas" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Credenciales no válidas. Inténtelo de nuevo." });
    }

    user.lastSeen = new Date();
    user.lastSeenStatus = "online";
    await user.save();

    generateToken(user._id, res);
    
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      lastSeen: user.lastSeen,
      lastSeenStatus: user.lastSeenStatus,
    });
  } catch (error) {
    console.error("Error en el controlador de login:", error.message);
    
    if (error.code === 'ECONNRESET' || error.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        message: "Problema temporal con la base de datos. Por favor, intenta de nuevo." 
      });
    }
    
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const logout = async (req, res) => {
  try {
    console.log('=== INICIANDO LOGOUT ===');
    
    const token = req.cookies.jwt;
    
    if (!token) {
      console.log('⚠️ No hay token en las cookies');
      res.cookie("jwt", "", { maxAge: 0 });
      return res.status(200).json({ message: "Sesión cerrada exitosamente" });
    }
    
    let userId = null;
    let userFullName = null;
    
    if (req.user && req.user._id) {
      userId = req.user._id;
      userFullName = req.user.fullName;
      console.log('✅ Usuario obtenido de req.user:', userFullName);
    } else {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        userId = decoded.userId;
        console.log('✅ Usuario obtenido del token JWT:', userId);
      } catch (jwtError) {
        console.log('❌ Error decodificando token:', jwtError.message);
      }
    }
    
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user) {
          userFullName = user.fullName;
          const lastSeenTime = new Date();
          user.lastSeen = lastSeenTime;
          user.lastSeenStatus = "offline";
          await user.save();
          
          console.log(`✅ Usuario ${userFullName} desconectado a las ${lastSeenTime}`);
          
          try {
            const { io, userSocketMap } = await import("../lib/socket.js");
            
            if (io) {
              io.emit("userStatusChanged", {
                userId: user._id.toString(),
                status: "offline",
                lastSeen: lastSeenTime
              });
              console.log(`📡 Evento userStatusChanged emitido`);
              
              io.emit("chatsUpdated");
              console.log(`📡 Evento chatsUpdated emitido para todos`);
              
              const onlineUsers = Object.keys(userSocketMap || {});
              io.emit("getOnlineUsers", onlineUsers);
              console.log(`📡 Usuarios online restantes: ${onlineUsers.length}`);
            }
          } catch (socketError) {
            console.error('❌ Error emitiendo evento socket:', socketError.message);
          }
        }
      } catch (dbError) {
        console.error('❌ Error en base de datos:', dbError.message);
      }
    }
    
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Sesión cerrada exitosamente" });
    console.log('✅ Cierre de sesión completado');
    
  } catch (error) {
    console.error("❌ Error en el controlador de logout:", error);
    res.cookie("jwt", "", { maxAge: 0 });
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
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};