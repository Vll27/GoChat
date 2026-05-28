import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { MessageCircleIcon, MailIcon, LoaderIcon, LockIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Link } from "react-router";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn } = useAuthStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
  <div 
    className="w-full flex items-center justify-center p-4 bg-black min-h-screen relative overflow-hidden group"
    onMouseMove={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }}
  >
    {/* Efecto de luz radial Cyan (Foco que sigue al mouse) */}
    <div
      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"
      style={{
        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(6, 182, 212, 0.15), transparent 75%)`
      }}
    />

    <div className="relative w-full max-w-md h-auto z-10">
      <BorderAnimatedContainer>
        <div className="w-full p-8 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
          <div className="w-full">
            {/* HEADING TEXT */}
            <div className="text-center mb-8">
              <MessageCircleIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h2 className="text-2xl font-bold text-slate-200 mb-2">Bienvenido</h2>
              <p className="text-slate-400">Iniciá sesión para ingresar a tu cuenta.</p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* EMAIL INPUT */}
              <div>
                <label className="auth-input-label">Correo electrónico</label>
                <div className="relative">
                  <MailIcon className="auth-input-icon" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="correo@dominio.com"
                  />
                </div>
              </div>

              {/* PASSWORD INPUT */}
              <div>
                <label className="auth-input-label">Contraseña</label>
                <div className="relative">
                  <LockIcon className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input pr-10"
                    placeholder="Contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-slate-400">Nunca compartás tu contraseña con nadie. Nisiquiera con GoChat.</p>
              </div>

              {/* SUBMIT BUTTON */}
              <button className="auth-btn" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <LoaderIcon className="w-full h-5 animate-spin text-center" />
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/signup" className="auth-link">
                ¿No tenés cuenta? ¡Registráte ya!
              </Link>
            </div>
          </div>
        </div>
      </BorderAnimatedContainer>
    </div>
  </div>
);
}
export default LoginPage;
