import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
  timeout: 15000, // 15 segundos - balance entre feedback y operaciones largas
});

// Interceptor de peticiones
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Haciendo petición ${config.method?.toUpperCase()} a: ${config.url}`);
    return config;
  },
  (error) => {
    console.error("Error en interceptor de peticiones:", error);
    return Promise.reject(error);
  }
);

// Interceptor de respuestas
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`Respuesta exitosa de ${response.config.url}`);
    return response;
  },
  (error) => {
    // No mostrar errores 401 (Unauthorized) en consola - son normales
    if (error.response?.status !== 401) {
      if (error.code === 'ECONNRESET' || error.message?.includes('timeout')) {
        console.error('Error de conexión - El backend podría estar caído');
      } else if (error.response?.status === 503) {
        console.error('Servicio no disponible - Problema de base de datos');
      }
      console.error(`Error desde ${error.config?.url}:`, error.message);
    }
    return Promise.reject(error);
  }
);