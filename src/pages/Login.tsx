import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { Button } from '../components/Button';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: authLoading } = useAuth();
  
  const from = location.state?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    if (!authLoading && profile) {
      navigate(from, { replace: true });
    }
  }, [profile, authLoading, navigate, from]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmedEmail = email.toLowerCase().trim();
    
    // If input is just a number, assume it's an admission number and append @skill.edu
    if (/^\d+$/.test(trimmedEmail)) {
      trimmedEmail = `${trimmedEmail}@skill.edu`;
    }
    
    setLoading(true);
    setError('');
    setResetSent(false);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
      // Navigation is handled by the useEffect watching `profile`
    } catch (error: any) {
      console.error('Auth failed:', error);
      let message = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetSent(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      setError(error.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setResetSent(false);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Navigation is handled by the useEffect watching `profile`
    } catch (error: any) {
      console.error('Google Auth failed:', error);
      setError(error.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100">
        <div className="bg-emerald-600 p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-emerald-400 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl border-4 border-emerald-500/20">
              <div className="text-emerald-600 font-black text-center leading-none">
                <p className="text-[10px] uppercase tracking-tighter">Skill</p>
                <p className="text-xl">CLUB</p>
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-1">SkillClub</h1>
            <p className="text-emerald-100 font-bold text-sm uppercase tracking-widest">Darul Huda Punganur</p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-stone-500 text-sm mt-1 font-medium">
              {isSignUp ? 'Register for your portal' : 'Sign in to access your portal'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">
              Password reset email sent! Please check your inbox.
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@skill.edu"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-stone-100 outline-none focus:border-emerald-600 transition-all bg-stone-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Password</label>
                {!isSignUp && (
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-stone-100 outline-none focus:border-emerald-600 transition-all bg-stone-50 focus:bg-white"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : (
                <>
                  {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </>
              )}
            </Button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-xs font-bold text-stone-500 hover:text-emerald-600 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
              <span className="px-4 bg-white text-stone-400">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="secondary"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-stone-100 hover:border-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google Account
          </Button>
        </div>
      </div>
    </div>
  );
}
