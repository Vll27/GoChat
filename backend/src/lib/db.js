import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    const { MONGO_URI } = ENV;
    if (!MONGO_URI) {
      console.error("MONGO_URI no está configurada. Saltando conexión a BD.");
      return;
    }

    mongoose.set("strictQuery", false);

    if (process.env.NODE_ENV !== 'production') {
      console.log("Conectando a MongoDB...");
    }
    
    // CONFIGURACIÓN MEJORADA PARA CONEXIONES ESTABLES
    const conn = await mongoose.connect(MONGO_URI, {
      maxPoolSize: 5, // Reducido para mejor estabilidad
      minPoolSize: 1,
      serverSelectionTimeoutMS: 30000, // 30 segundos
      socketTimeoutMS: 45000, // 45 segundos
      connectTimeoutMS: 30000, // Agregar timeout de conexión
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      // Opciones adicionales para mejorar estabilidad
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 10000
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log("MongoDB conectado exitosamente:", conn.connection.host);
      console.log("Nombre de la base de datos:", conn.connection.name);
    }

    // Manejo de eventos de conexión mejorado
    mongoose.connection.on('error', (err) => {
      console.error('Error de conexión MongoDB:', err.message);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error details:', err);
      }
    });

    mongoose.connection.on('disconnected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('MongoDB desconectado - Intentando reconectar...');
      }
    });

    mongoose.connection.on('reconnected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MongoDB reconectado exitosamente');
      }
    });

    mongoose.connection.on('connecting', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Conectando a MongoDB...');
      }
    });

    mongoose.connection.on('connected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MongoDB conectado');
      }
    });

  } catch (error) {
    console.error("Error conectando a MongoDB:", error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
};