/**
 * Login — Premium OMEGA SPA login page
 *
 * Full-bleed background image with glassmorphic card overlay.
 * Connects with OMEGA SPA POS real backend JWT authentication.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import spaBg from '../assets/Spa-BG.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loggedUser = await login(email.trim(), password);
      if (loggedUser) {
        navigate(ROLE_HOME[loggedUser.role] || '/', { replace: true });
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex items-center justify-center p-3 sm:p-6 relative overflow-x-hidden"
      style={{
        backgroundImage: `url(${spaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(30,30,28,0.75) 0%, rgba(30,30,28,0.50) 50%, rgba(30,30,28,0.65) 100%)' }} />

      <div className="w-full max-w-[420px] relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1
            className="text-3xl sm:text-5xl tracking-[0.25em] sm:tracking-[0.3em] whitespace-nowrap"
            style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontWeight: 400,
              color: '#F5D5A8',
              textShadow: '0 2px 20px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.4)',
            }}
          >
            OMEGA <span style={{ fontWeight: 600 }}>SPA</span>
          </h1>
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
            <span className="block w-8 sm:w-12 h-px" style={{ background: 'linear-gradient(to right, transparent, #F5D5A8)' }} />
            <p
              className="text-[10px] sm:text-xs tracking-[0.25em] sm:tracking-[0.3em] uppercase"
              style={{ fontWeight: 500, color: '#F5D5A8', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
            >
              Douala • Point of Sale
            </p>
            <span className="block w-8 sm:w-12 h-px" style={{ background: 'linear-gradient(to left, transparent, #F5D5A8)' }} />
          </div>
        </div>

        {/* Login Card — Glassmorphic */}
        <div
          className="border border-white/20 rounded-[20px] p-4 sm:p-6 shadow-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <h2 className="text-base font-semibold text-charcoal mb-0.5">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-sm text-muted-gray mb-4">
            Sign in to access your workspace.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Address */}
            <div>
              <label className="block text-[12px] font-medium text-muted-gray mb-1">
                Email Address
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoFocus
                disabled={isSubmitting}
                className="w-full h-[44px] px-4 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-medium text-muted-gray mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full h-[44px] px-4 pr-11 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray hover:text-charcoal transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-xs text-warning font-medium bg-warning-soft border border-warning/20 rounded-[8px] px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              className={`w-full h-[46px] flex items-center justify-center gap-2 font-bold text-sm rounded-[12px] border transition-all duration-200 mt-1 shadow-sm cursor-pointer ${email.trim() && password && !isSubmitting
                  ? 'bg-[#3D5A40] text-white border-[#3D5A40] hover:bg-[#2d432f] active:scale-[0.98] shadow-md'
                  : 'bg-[#DCE7D7] text-[#344833] border-[#B7CAB5] opacity-80 cursor-not-allowed'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn size={17} strokeWidth={2.4} />
                  Login
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
