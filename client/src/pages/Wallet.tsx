// ─────────────────────────────────────────────────────────────────────────────
// pages/Wallet.tsx — Gradient Escrow Wallet Card & Immutable Ledger
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatInr } from '../utils/money';

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [ledger, setLedger] = useState<any[]>([]);
  const [topupAmount, setTopupAmount] = useState<string>('25000');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchWalletData = async () => {
    try {
      const res = await api.get('/wallet');
      setLedger(res.data.ledger);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) return;

    setSubmitting(true);
    setMessage('');
    try {
      const res = await api.post('/wallet/topup', { amountRupees: amount });
      setMessage(res.data.message);
      await refreshUser();
      await fetchWalletData();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Top-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getLedgerBadge = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
            DEPOSIT
          </span>
        );
      case 'LOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            ESCROW LOCK
          </span>
        );
      case 'RELEASE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            RELEASE
          </span>
        );
      case 'REFUND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
            <span className="material-symbols-outlined text-[13px]">undo</span>
            REFUND
          </span>
        );
      case 'SPLIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
            <span className="material-symbols-outlined text-[13px]">call_split</span>
            SPLIT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
            {type}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#86868B]">
        <span className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mr-3"></span>
        Loading Wallet & Ledger...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
          Simulated Escrow Wallet
        </h1>
        <p className="text-xs text-[#86868B] mt-1">
          Double-entry financial accounting backed by an append-only, tamper-proof audit ledger
        </p>
      </div>

      {/* Grid: Gradient Card on Left, Top-Up Form on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Gradient Escrow Wallet Card */}
        <div className="md:col-span-5 relative overflow-hidden rounded-3xl p-7 text-white shadow-xl bg-gradient-to-br from-[#FCE38A] via-[#F38181] to-[#6C5CE7] flex flex-col justify-between min-h-[240px]">
          {/* Subtle iridescent glow overlay */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
              <span className="material-symbols-outlined text-[15px]">credit_card</span>
              <span className="text-xs font-bold tracking-wider uppercase text-white">
                TrustPay Digital Escrow
              </span>
            </div>
            <span className="material-symbols-outlined text-[24px] text-white/90">contactless</span>
          </div>

          <div className="relative z-10 my-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 block mb-1">
              Available Escrow Balance
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {formatInr(user?.walletBalance || 0)}
            </span>
            <p className="text-[11px] text-white/80 mt-1">
              Stored as integer paise (zero floating-point errors)
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-white/90 border-t border-white/20 pt-3">
            <span className="font-semibold tracking-wide uppercase">{user?.name}</span>
            <span className="font-mono text-[11px] text-white/80">ID #{user?.id?.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* Demo Top-up Controls */}
        <div className="md:col-span-7 bg-white p-7 rounded-3xl border border-black/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[20px] text-[#0071E3]">add_card</span>
              <h2 className="text-base font-bold text-[#1D1D1F]">
                Simulate Demo Fund Top-Up
              </h2>
            </div>
            <p className="text-xs text-[#86868B] mb-5">
              Add sandbox INR test funds to your wallet to test locking funds into project milestones.
            </p>

            <form onSubmit={handleTopup} className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-[#86868B]">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  max="1000000"
                  step="100"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full bg-[#F5F5F7] focus:bg-white text-base font-semibold text-[#1D1D1F] rounded-2xl pl-8 pr-4 py-3 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
                  placeholder="25000"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setTopupAmount(String(amt))}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] border border-black/5 transition"
                  >
                    +₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Deposit Funds to Wallet'}
                </button>

                {message && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    {message}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 3. Immutable Financial Ledger Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">Immutable Financial Ledger</h2>
            <p className="text-xs text-[#86868B]">
              Double-entry append-only audit log. Entries are permanent and cannot be modified or deleted.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5F5F7] text-[#1D1D1F]">
            {ledger.length} Transactions
          </span>
        </div>

        {ledger.length === 0 ? (
          <div className="p-12 text-center text-[#86868B]">
            <span className="material-symbols-outlined text-[40px] text-gray-300 mb-2">receipt</span>
            <p className="text-sm font-medium text-[#1D1D1F]">No transactions recorded yet</p>
            <p className="text-xs text-[#86868B] mt-1">
              Top-up your wallet or fund project milestones to generate immutable ledger entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F7] text-[#86868B] uppercase tracking-wider text-[10px] font-semibold border-b border-black/5">
                <tr>
                  <th className="py-3.5 px-6">Entry & Timestamp</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Project</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-[#1D1D1F]">
                {ledger.map((entry) => {
                  const isPositive = entry.toUserId === user?.id && entry.type !== 'LOCK';
                  return (
                    <tr key={entry.id} className="hover:bg-black/[0.015] transition">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#86868B] block">#{entry.id}</span>
                        <span className="text-[#86868B] text-[11px]">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getLedgerBadge(entry.type)}
                      </td>
                      <td className="py-4 px-6 text-xs font-medium max-w-xs">
                        {entry.note}
                      </td>
                      <td className="py-4 px-6 text-[#86868B] whitespace-nowrap">
                        {entry.project ? entry.project.title : '—'}
                      </td>
                      <td className={`py-4 px-6 text-right font-bold text-sm whitespace-nowrap ${
                        isPositive ? 'text-[#34C759]' : 'text-[#1D1D1F]'
                      }`}>
                        {isPositive ? '+' : ''}{formatInr(entry.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
