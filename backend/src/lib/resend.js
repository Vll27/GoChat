import {Resend} from "resend";
import 'dotenv/config';

const apiKey = process.env.RESEND_API_KEY;
const isValidKey = apiKey && apiKey !== 'demo' &&
apiKey !== 'your_resend_api_key' && apiKey !== 're_demo_key_123' &&
apiKey.startsWith('re_');

// Mock
const resendClient = isValidKey
? new Resend(apiKey)
: {
  emails:{
    send: async (options) => {
      console.log('Simulación de envío de correo con Resend');
      console.log('Para:', options.to);
      console.log('Asunto:', options.subject);
      console.log('De:', options.from);
      console.log('Resend deshabilitado - Sin llave válida');
      return { data: { id: 'mock-' + Date.now() }, error: null};
    }
  }
};

const sender = {
  email: process.env.EMAIL_FROM || 'no_reply@localhost.com',
  name: process.env.EMAIL_FROM_NAME || 'GoChat Dev'
};

if (!isValidKey){
  console.warn('RESEND_API_KEY no configurada o inválida. El envío de correos estará simulado.');
}else{
  console.log('Resend configurado: envío habilitado.');
}

export { resendClient, sender };