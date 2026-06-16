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

// ==================== MIDDLEWARE DE SEGURIDAD Y RENDIMIENTO ====================

// Helmet para endurecer cabeceras HTTP en producción
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Permitir scripts y estilos del propio servidor y estilos en línea de React
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // 📷 Permitir imágenes locales y de tu cuenta de Cloudinary
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      // 📹 Permitir videos locales y de tu cuenta de Cloudinary
      mediaSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      // 🔌 Permitir conexiones de la API, WebSockets y URIs de datos
      connectSrc: ["'self'", "data:", "ws:", "wss:"],
    },
  },
}));

// Gzip compression para acelerar la carga del monolito
app.use(compression());

// Rate limiting selectivo para proteger la API de abusos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 intentos por IP
  message: "Demasiados intentos desde esta IP, por favor intenta más tarde.",
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 peticiones por minuto
  message: "Demasiadas peticiones consecutivas, espera un momento.",
  skip: () => ENV.NODE_ENV === "development",
});

// ==================== MANEJO PERIMETRAL DE ERRORES DE CONEXIÓN ====================

app.use((req, res, next) => {
  req.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('⚠️ Client connection reset detectado en el flujo perimetral.');
    }
  });
  res.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('⚠️ Response connection reset detectado.');
    }
  });
  next();
});

// Payload Sizing estricto (Equilibrio de capacidad: subida de imágenes optimizada a 10mb)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ==================== CORS CONFIGURACIÓN COMPARTIDA Y CONTEXTUAL ====================

const corsOptions = {
  origin: function (origin, callback) {
    // 1. Mapeamos los orígenes permitidos y les removemos la barra final '/' si la llevan
    const rawOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://192.168.0.6:5173",
  "http://localhost:5001", // 👈 Agregá este maje aquí para que deje de joder
  ENV.CLIENT_URL
];

    const allowedOrigins = rawOrigins
      .filter(Boolean)
      .map(url => url.trim().replace(/\/$/, "")); // Quita la barra diagonal del final obligatoriamente

    // 2. Permitir peticiones sin origen (como Postman o llamadas del mismo servidor)
    if (!origin) return callback(null, true);

    // Saneamos también el origen entrante por seguridad
    const cleanOrigin = origin.trim().replace(/\/$/, "");

    // 3. Validación flexible
    if (ENV.NODE_ENV !== "production" || allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.log("❌ CORS bloqueado para origen real:", origin);
      console.log("📋 Orígenes permitidos en el backend:", allowedOrigins);
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

// ==================== DEBUG MIDDLEWARE (Solo desarrollo) ====================

if (ENV.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url} - Origin: ${req.headers.origin || 'same-origin'}`);
    next();
  });
}

// ==================== RUTAS DE LA API ====================

// Health check para monitoreo en Render
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/messages", apiLimiter, messageRoutes);
app.use("/api/contacts", apiLimiter, contactRoutes);
app.use("/api", accesoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/message-status", apiLimiter, messageStatusRoutes);

// ==================== ACOPLAMIENTO MONOLÍTICO: ARCHIVOS ESTÁTICOS ====================

const distPath = path.resolve(__dirname, "../../GoChat/frontend/dist");
// Servir de forma nativa los recursos compilados de React
console.log("👉 Ruta del Frontend compilado:", distPath);
app.use(express.static(distPath));

// Catch-All (Ruta comodín): Delega el manejo de URLs al React Router de la SPA
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      console.error("❌ Error al enviar index.html:", err.message);
      return res.status(500).json({ error: "El contenedor estático index.html no fue localizado." });
    }
  });
});

// ==================== GESTIÓN DE EXCEPCIONES GLOBAL HIGIENIZADA ====================

app.use((error, req, res, next) => {
  if (error.code === 'ECONNRESET') {
    console.log('⚠️ Connection reset by client interceptado globalmente.');
    return;
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El archivo que intentas subir excede el límite permitido.' });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Acceso denegado por políticas de CORS de producción.' });
  }
  
  // Auditoría en consola interna del servidor (Sin fugas de infraestructura hacia el cliente)
  console.error("❌ [MANEJADOR GLOBAL DE ERRORES]:", error.message || error);
  res.status(500).json({ message: 'Error interno en el servidor al procesar la solicitud.' });
});

// ==================== MANEJO DE PROCESOS Y SHUTDOWN CONTROLADO ====================

process.on('uncaughtException', (error) => {
  console.error('💥 Excepción No Controlada (Uncaught Exception):', error.message || error);
  if (ENV.NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa Rechazada No Manejada en:', promise, 'Razón:', reason);
  if (ENV.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Cierre controlado (Graceful Shutdown) exigido para despliegues limpios en la nube
const shutdown = async () => {
  console.log('🛑 Cerrando procesos del servidor de forma ordenada...');
  server.close(() => {
    console.log('✅ Servidor HTTP y Sockets cerrados exitosamente.');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('⚠️ Timeout forzado de apagado.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ==================== INICIO DEL SERVICIO ====================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo de forma nativa en el puerto: ${PORT}`);
  console.log(`🌍 Entorno activo: ${ENV.NODE_ENV || 'development'}`);
  console.log(`🔗 URL del cliente configurada: ${ENV.CLIENT_URL || 'http://localhost:5173'}`);
  connectDB();
});