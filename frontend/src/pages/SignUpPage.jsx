import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { 
  MessageCircleIcon, 
  LockIcon, 
  MailIcon, 
  UserIcon, 
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  SparklesIcon
} from "lucide-react";
import { Link } from "react-router";
import { StrictEmailValidator, validatePassword } from "../lib/validationUtils";

function SignUpPage() {
  const [formData, setFormData] = useState({ 
    fullName: "", 
    email: "", 
    password: "" 
  });
  const [validation, setValidation] = useState({
    email: { valid: null, message: "", suggestion: "" },
    password: { valid: null, strength: 0, strengthText: "", validations: [] },
    formValid: false
  });
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  
  const { signup, isSigningUp } = useAuthStore();
  const emailValidator = new StrictEmailValidator();

  // Validación en tiempo real
  useEffect(() => {
    const validateForm = () => {
      const emailValidation = emailValidator.validateStrictEmail(formData.email);
      const passwordValidation = validatePassword(formData.password);

      const isFormValid = 
        formData.fullName.trim().length > 0 &&
        emailValidation.valid === true &&
        passwordValidation.isValid === true;

      setValidation({
        email: emailValidation,
        password: passwordValidation,
        formValid: isFormValid
      });

      // Mostrar validación de contraseña solo si no es válida aún
      if (formData.password && !passwordValidation.isValid) {
        setShowPasswordValidation(true);
      } else {
        setShowPasswordValidation(false);
      }
    };

    validateForm();
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validation.formValid) {
      signup(formData);
    }
  };

  const getEmailIcon = () => {
    if (!formData.email) return <MailIcon className="auth-input-icon" />;
    if (validation.email.valid === true) return <CheckCircleIcon className="auth-input-icon text-green-500" />;
    if (validation.email.valid === false) return <XCircleIcon className="auth-input-icon text-red-500" />;
    return <MailIcon className="auth-input-icon" />;
  };

  const getPasswordStrengthColor = () => {
    if (validation.password.strength <= 2) return 'text-red-500';
    if (validation.password.strength <= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStrengthBarColor = () => {
    if (validation.password.strength <= 2) return 'bg-red-500';
    if (validation.password.strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900 min-h-screen">
      <div className="relative w-full max-w-6xl md:h-[800px] h-auto">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row">
            {/* COLUMNA DE FORMULARIO - LADO IZQUIERDO */}
            <div className="md:w-1/2 p-6 md:p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                {/* TEXTO DEL TÍTULO */}
                <div className="text-center mb-8">
                  <MessageCircleIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">Crear una cuenta</h2>
                  <p className="text-slate-400">Regístrate para obtener una nueva cuenta</p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* NOMBRE COMPLETO */}
                  <div className="space-y-2">
                    <label className="auth-input-label">Nombre completo</label>
                    <div className="relative">
                      <UserIcon className="auth-input-icon" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="input"
                        placeholder="Octavio Cortez"
                        required
                      />
                    </div>
                  </div>

                  {/* ENTRADA DE CORREO ELECTRÓNICO */}
                  <div className="space-y-2 relative">
                    <label className="auth-input-label">Correo electrónico</label>
                    <div className="relative">
                      {getEmailIcon()}
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`input ${formData.email ? (validation.email.valid ? 'border-green-500' : validation.email.valid === false ? 'border-red-500' : '') : ''}`}
                        placeholder="octa@gmail.com"
                        required
                      />
                    </div>
                    
                    {/* Mensaje de error/sugerencia - POSICIÓN ABSOLUTA */}
                    {formData.email && validation.email.message && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-10">
                        <div className={`p-3 rounded-lg border backdrop-blur-sm shadow-lg ${
                          validation.email.suggestion 
                            ? 'bg-amber-500/10 border-amber-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}>
                          <div className="flex items-start gap-2">
                            <AlertCircleIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              validation.email.suggestion ? 'text-amber-400' : 'text-red-400'
                            }`} />
                            <div className="flex-1">
                              <p className={`text-sm ${validation.email.suggestion ? 'text-amber-300' : 'text-red-300'}`}>
                                {validation.email.message}
                              </p>
                              {validation.email.suggestion && (
                                <div className="mt-2 flex items-center gap-2">
                                  <SparklesIcon className="w-3 h-3 text-cyan-400" />
                                  <span className="text-cyan-400 text-sm">
                                    ¿Quiso decir:{' '}
                                    <button
                                      type="button"
                                      className="underline hover:text-cyan-300 transition-colors font-medium"
                                      onClick={() => setFormData({...formData, email: validation.email.suggestion})}
                                    >
                                      {validation.email.suggestion}
                                    </button>
                                    ?
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONTRASEÑA */}
                  <div className="space-y-2 relative">
                    <label className="auth-input-label">Contraseña</label>
                    <div className="relative">
                      <LockIcon className="auth-input-icon" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`input ${formData.password ? (validation.password.isValid ? 'border-green-500' : validation.password.isValid === false ? 'border-red-500' : '') : ''}`}
                        placeholder="Introduce tu contraseña"
                        required
                      />
                    </div>
                    
                    {/* Indicador de fortaleza de contraseña - SOLO SE MUESTRA SI NO ES VÁLIDA */}
                    {formData.password && showPasswordValidation && !validation.password.isValid && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-10">
                        <div className="p-3 bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-700/50 space-y-2 shadow-lg">
                          {/* Barra de fuerza compacta */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Nivel de seguridad:</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${getPasswordStrengthColor()} bg-slate-700/50`}>
                              {validation.password.strengthText}
                            </span>
                          </div>
                          
                          {/* Barra de progreso más pequeña */}
                          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${getStrengthBarColor()}`}
                              style={{ width: `${(validation.password.strength / 5) * 100}%` }}
                            />
                          </div>

                          {/* Reglas de validación compactas */}
                          <div className="space-y-1.5">
                            {validation.password.validations?.map((rule, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  rule.test ? 'bg-green-500/20' : 'bg-red-500/20'
                                }`}>
                                  {rule.test ? (
                                    <CheckCircleIcon className="w-2.5 h-2.5 text-green-500" />
                                  ) : (
                                    <XCircleIcon className="w-2.5 h-2.5 text-red-500" />
                                  )}
                                </div>
                                <span className={`text-xs ${rule.test ? 'text-green-400' : 'text-red-400'}`}>
                                  {rule.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTÓN ENVIAR */}
                  <div className="pt-6">
                    <button 
                      className={`w-full auth-btn transition-all duration-300 ${
                        !validation.formValid 
                          ? 'opacity-50 cursor-not-allowed grayscale' 
                          : 'hover:bg-cyan-600 hover:scale-[1.02] shadow-lg shadow-cyan-500/25'
                      }`} 
                      type="submit" 
                      disabled={isSigningUp || !validation.formValid}
                    >
                      {isSigningUp ? (
                        <div className="flex items-center justify-center gap-2">
                          <LoaderIcon className="w-5 h-5 animate-spin" />
                          <span>Creando cuenta...</span>
                        </div>
                      ) : (
                        "Crear una cuenta"
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8 text-center">
                  <Link to="/login" className="auth-link hover:text-cyan-300 transition-colors">
                    ¿Ya tienes una cuenta? Inicia sesión
                  </Link>
                </div>
              </div>
            </div>

            {/* ILUSTRACIÓN DEL FORMULARIO - LADO DERECHO */}
            <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div className="text-center">
                <img
                  src="/signup.png"
                  alt="Personas usando dispositivos móviles"
                  className="w-full max-w-md h-auto object-contain mx-auto"
                />
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-medium text-cyan-400">Comienza tu viaje hoy</h3>
                  <div className="mt-4 flex justify-center gap-3">
                    <span className="auth-badge bg-cyan-500/20 text-cyan-300">Gratis</span>
                    <span className="auth-badge bg-green-500/20 text-green-300">Fácil</span>
                    <span className="auth-badge bg-purple-500/20 text-purple-300">Privado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default SignUpPage;