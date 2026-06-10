import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import 'dotenv/config';

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import contactRoutes from "./routes/contact.route.js";
import accesoRoutes from "./routes/acceso.routes.js";
import userRoutes from "./routes/user.routes.js"; 
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();
const PORT = ENV.PORT || 3000;

// Middleware perimetral para prevenir ECONNRESET
app.use((req, res, next) => {
  req.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('Client connection reset detectado en el flujo perimetral.');
    }
  });
  next();
});

// Límite perimetral estricto para payloads de entrada
app.use(express.json({ limit: "5mb" }));

// CONFIGURACIÓN DE CORS ENDURECIDA CONTEXTUALMENTE
// La Guía 10 exige eliminar el riesgo de CORS compartiendo el mismo origen en producción.
if (ENV.NODE_ENV !== "production") {
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://127.0.0.1:5173",
        "http://192.168.0.6:5173"
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("⚠️ CORS bloqueado en desarrollo para origen:", origin);
        callback(new Error('Acceso denegado por políticas de CORS de desarrollo.'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  }));
  app.options('*', cors());
}

app.use(cookieParser());

// ========================================================
// CAPA PERIMETRAL: RUTAS DE LA API (DEBEN IR PRIMERO)
// ========================================================
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api", accesoRoutes);
app.use("/api/users", userRoutes); 

// ========================================================
// ACOPLAMIENTO MONOLÍTICO: ARCHIVOS ESTÁTICOS DEL FRONTEND
// ========================================================
if (ENV.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../frontend/dist");
  
  // Servir de forma nativa los recursos compilados de React (JS, CSS, HTML, Imágenes)
  app.use(express.static(distPath));

  // Catch-All (Ruta comodín): Delega el manejo de URLs al React Router de la SPA
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Manejador básico en desarrollo para evitar errores al consultar la raíz
  app.get("/", (req, res) => {
    res.status(200).json({ mensaje: "API del Servidor corriendo en modo de desarrollo local." });
  });
}

// ========================================================
// GESTIÓN DE EXCEPCIONES NORMALIZADA (Saneamiento global de errores)
// ========================================================
app.use((error, req, res, next) => {
  if (error.code === 'ECONNRESET') {
    console.log('Connection reset by client interceptado globalmente.');
    return;
  }
  
  // Auditoría en la consola interna del servidor (No se expone al usuario)
  console.error('❌ [MANEJADOR GLOBAL DE ERRORES]:', error.message || error);
  
  // Rúbrica Guía 10: Respuesta normalizada e higienizada al cliente (Cero fugas de infraestructura)
  res.status(500).json({ message: 'Error interno en el servidor al procesar la solicitud.' });
});

process.on('uncaughtException', (error) => {
  console.error('💥 Excepción No Controlada (Uncaught Exception):', error.message || error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa Rechazada No Manejada en:', promise, 'Razón:', reason);
});

// Inicialización del servicio
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en ejecución nativa sobre el puerto: ${PORT}`);
  connectDB();
});