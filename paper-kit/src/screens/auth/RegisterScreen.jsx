/* RegisterScreen */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PrimaryButton } from '../../components/ui/Button';
import './AuthScreen.css';

export default function RegisterScreen() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Google registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__brand">
        <div className="auth-screen__logo">
          <img src="/icon-128.png" alt="PaperKit Logo" width="48" height="48" style={{ borderRadius: '12px' }} />
        </div>
        <h1 className="auth-screen__app-name">PaperKit</h1>
              <p className="auth-screen__tagline">All-in-One PDF Solution</p>
            </div>

            <div className="auth-screen__card">
              <h2 className="auth-screen__title">Create account</h2>
              <p className="auth-screen__subtitle">Join PaperKit today</p>

              {error && <div className="auth-screen__error" role="alert">{error}</div>}

              <form onSubmit={handleSubmit} className="auth-screen__form">
                <div className="auth-screen__field">
                  <label className="auth-screen__label" htmlFor="register-name">Full Name</label>
                  <div className="auth-screen__input-wrap">
                    <User size={16} color="var(--color-text-muted)" className="auth-screen__input-icon" />
                    <input id="register-name" className="auth-screen__input" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
                  </div>
                </div>

                <div className="auth-screen__field">
                  <label className="auth-screen__label" htmlFor="register-email">Email</label>
                  <div className="auth-screen__input-wrap">
                    <Mail size={16} color="var(--color-text-muted)" className="auth-screen__input-icon" />
                    <input id="register-email" className="auth-screen__input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
                  </div>
                </div>

                <div className="auth-screen__field">
                  <label className="auth-screen__label" htmlFor="register-password">Password</label>
                  <div className="auth-screen__input-wrap">
                    <Lock size={16} color="var(--color-text-muted)" className="auth-screen__input-icon" />
                    <input id="register-password" className="auth-screen__input" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
                    <button type="button" className="auth-screen__pass-toggle" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Hide password' : 'Show password'}>
                      {showPass ? <EyeOff size={16} color="var(--color-text-muted)" /> : <Eye size={16} color="var(--color-text-muted)" />}
                    </button>
                  </div>
                </div>

                <PrimaryButton type="submit" loading={loading} id="register-submit-btn">
                  Create Account
                </PrimaryButton>
              </form>

              <div className="auth-screen__divider"><span>or continue with</span></div>

              <button className="auth-screen__google-btn" onClick={handleGoogleLogin} id="register-google-btn">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

        <p className="auth-screen__switch">
          Already have an account?{' '}
          <button className="auth-screen__switch-link" onClick={() => navigate('/login')} id="register-login-link">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
