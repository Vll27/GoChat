import "dotenv/config";

export const ENV = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Database
  MONGO_URI: process.env.MONGO_URI,
<<<<<<< HEAD
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
=======
  
  // Auth
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  
  // Frontend
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  
  // Email (Resend)
>>>>>>> origin/Prisma-Implementation
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "GoChat",
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Arcjet (Rate limiting)
  ARCJET_KEY: process.env.ARCJET_KEY,
  ARCJET_ENV: process.env.ARCJET_ENV || process.env.NODE_ENV || "development",
  
  // Redis (Opcional para escalabilidad)
  REDIS_URL: process.env.REDIS_URL,
};

// Validación de variables CRÍTICAS (con errores claros)
const criticalEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingCritical = criticalEnvVars.filter(key => !ENV[key]);

if (missingCritical.length > 0) {
  console.error('\n ERROR: Faltan variables críticas en .env:\n');
  missingCritical.forEach(key => {
    console.error(`   → ${key}`);
  });
  console.error('\n Por favor, completa estas variables en backend/.env\n');
  
  if (ENV.NODE_ENV === 'production') {
    process.exit(1);
  }
}

//  Advertencias para variables opcionales pero importantes
if (!ENV.CLOUDINARY_CLOUD_NAME) {
  console.warn('\n  ADVERTENCIA: Cloudinary no configurado');
  console.warn('   Las imágenes NO funcionarán correctamente');
  console.warn('   Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET\n');
}

if (!ENV.RESEND_API_KEY) {
  console.warn('\n  ADVERTENCIA: Resend no configurado');
  console.warn('   Los emails de verificación NO funcionarán\n');
}

//  Mostrar configuración actual (solo en desarrollo)
if (ENV.NODE_ENV === 'development') {
  console.log('\n Configuración actual:');
  console.log(`   → Puerto: ${ENV.PORT}`);
  console.log(`   → Entorno: ${ENV.NODE_ENV}`);
  console.log(`   → MongoDB: ${ENV.MONGO_URI ? 'Configurado' : ' No configurado'}`);
  console.log(`   → JWT: ${ENV.JWT_SECRET ? ' Configurado' : ' No configurado'}`);
  console.log(`   → Cloudinary: ${ENV.CLOUDINARY_CLOUD_NAME ? ' Configurado' : ' No configurado'}`);
  console.log(`   → Redis: ${ENV.REDIS_URL ? ' Configurado' : ' No configurado (modo single-instance)'}`);
  console.log(`   → Client URL: ${ENV.CLIENT_URL}\n`);
}