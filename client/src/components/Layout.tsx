// ─────────────────────────────────────────────────────────────────────────────
// components/Layout.tsx — Premium Fintech Top Navigation Shell
// ─────────────────────────────────────────────────────────────────────────────

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatInr } from '../utils/money';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Projects', path: '/projects', icon: 'work' },
    { name: 'Invoices', path: '/invoices', icon: 'receipt_long' },
    { name: 'Wallet & Ledger', path: '/wallet', icon: 'account_balance_wallet' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans">
      {/* Top Glassmorphic Navigation Header */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1200px] h-full mx-auto px-6 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#1D1D1F]">TrustPay</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B]">
                {user?.role} Portal
              </span>
            </div>
          </Link>

          {/* Center Pill Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-black/5 p-1 rounded-full">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-[#1D1D1F] shadow-sm'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Balance + User Avatar + Logout */}
          <div className="flex items-center gap-3">
            {/* Live Wallet Escrow Pill */}
            <Link
              to="/wallet"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-black/5 shadow-sm hover:border-black/10 transition"
            >
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse"></span>
              <span className="text-xs font-medium text-[#86868B] hidden sm:inline">Escrow:</span>
              <span className="text-xs font-bold text-[#1D1D1F]">
                {formatInr(user?.walletBalance || 0)}
              </span>
            </Link>

            {/* User Profile + Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-black/10">
              <div
                title={`${user?.name} (${user?.email})`}
                className="w-8 h-8 rounded-full bg-blue-100 text-[#0071E3] font-bold text-xs flex items-center justify-center border border-blue-200"
              >
                {user?.name?.charAt(0) || 'U'}
              </div>

              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-red-50 transition"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Canvas */}
      <main className="flex-1 pt-20 pb-12 px-6">
        <div className="max-w-[1200px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
