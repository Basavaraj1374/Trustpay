// ─────────────────────────────────────────────────────────────────────────────
// pages/Login.tsx — Authentication with Clean Fintech Card Aesthetics
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('client@demo.com');
  const [password, setPassword] = useState('Demo1234!');
  const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'FREELANCER'>('CLIENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your email & password.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (role: 'CLIENT' | 'FREELANCER' | 'MEDIATOR') => {
    if (role === 'CLIENT') {
      setEmail('client@demo.com');
      setPassword('Demo1234!');
      setSelectedRole('CLIENT');
    } else if (role === 'FREELANCER') {
      setEmail('freelancer@demo.com');
      setPassword('Demo1234!');
      setSelectedRole('FREELANCER');
    } else {
      setEmail('admin@demo.com');
      setPassword('Demo1234!');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-black/5 p-8 sm:p-10 relative">
        {/* Top Brand Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0071E3] flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4">
            <span className="material-symbols-outlined text-[30px]">verified_user</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
            Welcome to TrustPay
          </h1>
          <p className="text-xs text-[#86868B] mt-1 max-w-xs leading-relaxed">
            Institutional-grade milestone escrow and automated digital contracts
          </p>
        </div>

        {/* 1-Click Fast Profile Switcher */}
        <div className="mt-6">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] text-center mb-2">
            1-Click Demo Profiles
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoUser('CLIENT')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                email === 'client@demo.com'
                  ? 'bg-blue-50 text-[#0071E3] border-blue-200 shadow-sm'
                  : 'bg-black/[0.02] text-[#86868B] border-black/5 hover:bg-black/[0.04]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">business_center</span>
              <span>Client</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoUser('FREELANCER')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                email === 'freelancer@demo.com'
                  ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
                  : 'bg-black/[0.02] text-[#86868B] border-black/5 hover:bg-black/[0.04]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Freelancer</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoUser('MEDIATOR')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                email === 'admin@demo.com'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                  : 'bg-black/[0.02] text-[#86868B] border-black/5 hover:bg-black/[0.04]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <span>Mediator</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-[#FF3B30] p-3 rounded-xl text-xs font-medium border border-red-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-[#86868B] text-[18px]">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#F5F5F7] focus:bg-white text-sm text-[#1D1D1F] rounded-xl pl-10 pr-4 py-2.5 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-[#86868B] text-[18px]">
                lock
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F5F5F7] focus:bg-white text-sm text-[#1D1D1F] rounded-xl pl-10 pr-4 py-2.5 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-full bg-[#0071E3] hover:bg-blue-600 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#86868B]">
          Encrypted with 256-bit institutional escrow safeguards
        </p>
      </div>
    </div>
  );
}
