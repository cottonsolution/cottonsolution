'use client';
import { useState } from 'react';
import { Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push('/');
      router.refresh();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password.length < 6) {
      setLoading(false);
      setError('Password must be at least 6 characters.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || email } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled — user is logged in immediately
      router.push('/');
      router.refresh();
    } else {
      // Email confirmation is required before login
      setMessage('Account created! Please check your email to confirm your account, then log in.');
      setMode('login');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card-3d p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl shadow-inner font-bold">
            🌾
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to Cotton Solution</h1>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login' ? 'Login to your account' : 'Create a new account'}
          </p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${mode === 'login' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${mode === 'signup' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
          >
            Register
          </button>
        </div>

        {message && <p className="text-emerald-700 bg-emerald-50 text-xs font-semibold p-3 rounded-lg mb-4">{message}</p>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm">
              {loading ? 'Logging in...' : 'Login'} <ArrowRight size={16}/>
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm">
              {loading ? 'Creating account...' : 'Create Account'} <UserPlus size={16}/>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
