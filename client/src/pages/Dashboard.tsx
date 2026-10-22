// ─────────────────────────────────────────────────────────────────────────────
// pages/Dashboard.tsx — Executive Escrow Vault & Project Tracking Dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { formatInr } from '../utils/money';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then((res) => setProjects(res.data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#86868B]">
        <span className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mr-3"></span>
        Loading Escrow Vault...
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');
  const totalValuePaise = projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0);

  return (
    <div className="space-y-8">
      {/* 1. Header with Role Greeting & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Good day, {user?.name}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/wallet"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-black/5 hover:border-black/15 text-xs font-semibold text-[#1D1D1F] shadow-sm transition"
          >
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            Manage Wallet
          </Link>

          {user?.role === 'CLIENT' && (
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              + New Project
            </Link>
          )}
        </div>
      </div>

      {/* 2. Dark Escrow Vault Hero Card (Mesh/Ambient Aesthetic) */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#00458F] text-white shadow-xl">
        {/* Ambient Blur Accents */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col justify-between gap-6 min-h-[190px]">
          {/* Card Top Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
              <span className="material-symbols-outlined text-[16px] text-emerald-400">lock</span>
              <span className="text-xs font-semibold tracking-wider uppercase text-white/90">
                Institutional Escrow Vault
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse"></span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                Legally Encrypted
              </span>
            </div>
          </div>

          {/* Balance Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
                Available Wallet Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {formatInr(user?.walletBalance || 0)}
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-1">Instant withdrawal / milestone allocation</p>
            </div>

            <div className="sm:border-l sm:border-white/10 sm:pl-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
                Total Project Value
              </span>
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {formatInr(totalValuePaise)}
              </span>
              <p className="text-[11px] text-white/60 mt-1">
                Across {projects.length} project{projects.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
                Active Projects
              </span>
              <span className="text-2xl font-bold text-white">
                {activeProjects.length} Active
              </span>
              <p className="text-[11px] text-white/60 mt-1">
                Milestone releases protected
              </p>
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Link
                to="/wallet"
                className="px-4 py-1.5 rounded-full bg-white text-[#1D1D1F] hover:bg-slate-100 text-xs font-semibold shadow-sm transition"
              >
                Top-up Demo Funds
              </Link>
              <Link
                to="/invoices"
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition"
              >
                View Invoices
              </Link>
            </div>

            <span className="text-[11px] text-white/50 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              Double-Entry Immutable Ledger
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] mb-2">
            <span className="text-xs font-medium">Total Projects</span>
            <span className="material-symbols-outlined text-[20px] text-blue-500">work</span>
          </div>
          <span className="text-2xl font-bold text-[#1D1D1F]">{projects.length}</span>
          <p className="text-[11px] text-[#86868B] mt-1">Created under your account</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] mb-2">
            <span className="text-xs font-medium">Active Mandates</span>
            <span className="material-symbols-outlined text-[20px] text-emerald-500">lock_clock</span>
          </div>
          <span className="text-2xl font-bold text-[#1D1D1F]">{activeProjects.length}</span>
          <p className="text-[11px] text-[#86868B] mt-1">Funds locked in escrow</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] mb-2">
            <span className="text-xs font-medium">Auto-Approval Window</span>
            <span className="material-symbols-outlined text-[20px] text-purple-500">timer</span>
          </div>
          <span className="text-2xl font-bold text-[#1D1D1F]">7 Days</span>
          <p className="text-[11px] text-[#86868B] mt-1">Ghosting prevention daemon</p>
        </div>
      </div>

      {/* 4. Projects Grouped List */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1D1D1F]">Your Projects & Escrow Streams</h2>
            <p className="text-xs text-[#86868B]">Monitor milestone approvals, deliverables, and contracts</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5F5F7] text-[#1D1D1F]">
            {projects.length} Total
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center text-[#86868B]">
            <span className="material-symbols-outlined text-[40px] text-gray-300 mb-2">folder_open</span>
            <p className="text-sm font-medium text-[#1D1D1F]">No projects yet</p>
            <p className="text-xs text-[#86868B] mt-1">
              {user?.role === 'CLIENT'
                ? 'Create a project to initiate milestone escrow with your freelancer.'
                : 'You have not been assigned to any project yet.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-black/[0.015] transition group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-base font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition">
                        {project.title}
                      </h3>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          project.status === 'ACTIVE'
                            ? 'bg-blue-50 text-[#0071E3]'
                            : project.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-[#34C759]'
                            : project.status === 'CANCELLED'
                            ? 'bg-red-50 text-[#FF3B30]'
                            : 'bg-amber-50 text-[#FF9F0A]'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#86868B] truncate max-w-xl">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-[#86868B] mt-2">
                      <span>Client: <strong className="text-[#1D1D1F]">{project.client?.name}</strong></span>
                      <span>Freelancer: <strong className="text-[#1D1D1F]">{project.freelancer?.name || 'Unassigned'}</strong></span>
                      <span>• {project.milestones?.length || 0} Milestones</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4 shrink-0">
                    <div>
                      <span className="text-base font-bold text-[#1D1D1F] block">
                        {formatInr(project.totalBudget)}
                      </span>
                      <span className="text-[11px] text-[#0071E3] font-medium group-hover:underline">
                        Open Project
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[#86868B] group-hover:translate-x-1 transition-transform text-[20px]">
                      chevron_right
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
