import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import 'dotenv/config';

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import contactRoutes from "./routes/contact.route.js";
import accesoRoutes from "./routes/acceso.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageStatusRoutes from "./routes/messageStatus.routes.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();
const PORT = ENV.PORT || 3000;

// ==================== MIDDLEWARE DE SEGURIDAD ====================

// ✅ Helmet para seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// ✅ Compression para rendimiento
app.use(compression());

// ✅ Rate limiting SOLO para rutas sensibles (NO para todas)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 intentos por IP
  message: "Demasiados intentos, intenta más tarde",
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 peticiones por minuto
  message: "Demasiadas peticiones, espera un momento",
  skip: () => ENV.NODE_ENV === "development", // Saltar en desarrollo
});

// ==================== MANEJO DE ERRORES DE CONEXIÓN ====================

app.use((req, res, next) => {
  req.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('⚠️ Client connection reset');
    }
  });
  res.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('⚠️ Response connection reset');
    }
  });
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ==================== CORS CORREGIDO ====================

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://192.168.0.6:5173",
      ENV.CLIENT_URL
    ].filter(Boolean);
    
    // Permitir peticiones sin origin (como Postman) y en desarrollo
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || ENV.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      console.log("❌ CORS bloqueado para origen:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Accept", "X-Requested-With"],
  exposedHeaders: ["set-cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==================== DEBUG MIDDLEWARE (solo desarrollo) ====================

if (ENV.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url} - Origin: ${req.headers.origin || 'same-origin'}`);
    next();
  });
}

// ==================== RUTAS ====================

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Rutas públicas (con rate limit específico)
app.use("/api/auth", authLimiter, authRoutes);

// Rutas API (con rate limit más permisivo)
app.use("/api/messages", apiLimiter, messageRoutes);
app.use("/api/contacts", apiLimiter, contactRoutes);
app.use("/api", accesoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/message-status", apiLimiter, messageStatusRoutes);

// ==================== MANEJO DE ERRORES ====================

app.use((error, req, res, next) => {
  if (error.code === 'ECONNRESET') {
    console.log('⚠️ Connection reset by client');
    return;
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Archivo demasiado grande' });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy blocked this request' });
  }
  
  console.error("❌ Error:", error.message);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ==================== PRODUCCIÓN ====================

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// ==================== MANEJO DE PROCESOS ====================

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  // No cerrar el proceso en desarrollo
  if (ENV.NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
  if (ENV.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('⚠️ Timeout forzado');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ==================== INICIO ====================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${ENV.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${ENV.CLIENT_URL || 'http://localhost:5173'}`);
  connectDB();
});