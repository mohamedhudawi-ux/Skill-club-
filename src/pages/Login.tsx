import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, Chrome } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Email auth failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100">
        <div className="bg-brand-green p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-brand-gold rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl border-4 border-brand-gold/20">
              <div className="text-brand-green font-black text-center leading-none">
                <p className="text-[10px] uppercase tracking-tighter">Skill</p>
                <p className="text-xl">CLUB</p>
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-1">SkillClub</h1>
            <p className="text-brand-gold font-bold text-sm uppercase tracking-widest">Darul Huda Punganur</p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Students Union Portal</h2>
            <p className="text-stone-500 text-sm mt-1 font-medium">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-brand-green transition-colors" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-stone-100 outline-none focus:border-brand-green transition-all bg-stone-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-brand-green transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-stone-100 outline-none focus:border-brand-green transition-all bg-stone-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-4 text-stone-400 font-black">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-stone-100 text-stone-700 px-6 py-4 rounded-2xl font-bold hover:bg-stone-50 transition-all shadow-sm active:scale-[0.98]"
            >
              <Chrome size={20} className="text-blue-500" />
              Google Account
            </button>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-stone-500 font-bold hover:text-brand-green transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
