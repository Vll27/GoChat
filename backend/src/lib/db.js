import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    const { MONGO_URI } = ENV;
    if (!MONGO_URI) {
      console.error("❌ MONGO_URI no está configurada");
      process.exit(1);
    }

    mongoose.set("strictQuery", false);
    
    // ✅ Configuración optimizada para producción
    const conn = await mongoose.connect(MONGO_URI, {
      maxPoolSize: 20,        // Para 10k usuarios concurrentes
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    console.log(`🔌 Pool size: ${conn.connection.client.options.maxPoolSize}`);

    // ✅ Eventos de conexión mejorados
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB desconectado. Reconectando...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconectado');
    });

  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
    // No hacer exit(1) en producción, dejar que el orquestador maneje el reinicio
    if (ENV.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

// ✅ Graceful disconnect
export const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('✅ MongoDB desconectado');
};