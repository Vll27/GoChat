import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import contactRoutes from "./routes/contact.route.js";
import accesoRoutes from "./routes/acceso.routes.js";
import userRoutes from "./routes/user.routes.js"; // 👈 NUEVA RUTA
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

// Middleware para prevenir ECONNRESET
app.use((req, res, next) => {
  req.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('Client connection reset');
    }
  });
  next();
});

app.use(express.json({ limit: "5mb" }));

// CONFIGURACIÓN CORS MEJORADA
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
      console.log("CORS bloqueado para origen:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
}));

app.options('*', cors());

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api", accesoRoutes);
app.use("/api/users", userRoutes); // 👈 NUEVA RUTA

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  if (error.code === 'ECONNRESET') {
    console.log('Connection reset by client');
    return;
  }
  
  console.error('Global error handler:', error.message);
  res.status(500).json({ message: 'Internal server error' });
});

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log("Server running on port: " + PORT);
  connectDB();
});