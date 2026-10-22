// ─────────────────────────────────────────────────────────────────────────────
// pages/NewProject.tsx — Create Escrow Project with Clean Card UI
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function NewProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    totalBudgetRupees: '',
    freelancerEmail: 'freelancer@demo.com',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/projects', {
        ...form,
        totalBudgetRupees: Number(form.totalBudgetRupees),
      });
      const projectId = res.data.project.id;
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
          Create Escrow Project
        </h1>
        <p className="text-xs text-[#86868B] mt-1">
          Lock in deliverables, set milestones, and establish legal escrow protection.
        </p>
      </div>

      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-black/5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-[#FF3B30] p-4 rounded-2xl text-xs font-semibold border border-red-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1.5">
              Project Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-[#F5F5F7] focus:bg-white text-sm text-[#1D1D1F] font-semibold rounded-2xl px-4 py-3 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
              placeholder="e.g. Next.js SaaS Platform Redesign"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1.5">
              Scope of Work & Deliverables
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-[#F5F5F7] focus:bg-white text-xs leading-relaxed text-[#1D1D1F] rounded-2xl p-4 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
              placeholder="Detail all project phases, design files, APIs, and handover criteria..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1.5">
                Total Budget (INR ₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-[#86868B]">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.totalBudgetRupees}
                  onChange={(e) => setForm({ ...form, totalBudgetRupees: e.target.value })}
                  className="w-full bg-[#F5F5F7] focus:bg-white text-sm font-bold text-[#1D1D1F] rounded-2xl pl-8 pr-4 py-3 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
                  placeholder="50000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1.5">
                Freelancer Email
              </label>
              <input
                type="email"
                required
                value={form.freelancerEmail}
                onChange={(e) => setForm({ ...form, freelancerEmail: e.target.value })}
                className="w-full bg-[#F5F5F7] focus:bg-white text-sm text-[#1D1D1F] rounded-2xl px-4 py-3 border border-black/5 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition"
                placeholder="freelancer@demo.com"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-black/5">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Creating Mandate...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>Next: Configure Milestones</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
