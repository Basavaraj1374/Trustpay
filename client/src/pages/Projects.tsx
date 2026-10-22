// ─────────────────────────────────────────────────────────────────────────────
// pages/Projects.tsx — Project Stream & Escrow Mandates
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { formatInr } from '../utils/money';

export default function Projects() {
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
        Loading Projects...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Projects & Escrow Mandates
          </h1>
          <p className="text-xs text-[#86868B] mt-1">
            {user?.role === 'CLIENT'
              ? 'Projects you have created and funded'
              : 'Client contracts assigned to you'}
          </p>
        </div>

        {user?.role === 'CLIENT' && (
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            + New Project
          </Link>
        )}
      </div>

      {/* Projects List Card */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-16 text-center text-[#86868B]">
            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3 block">
              folder_open
            </span>
            <p className="text-base font-bold text-[#1D1D1F]">No projects yet</p>
            <p className="text-xs text-[#86868B] mt-1 max-w-sm mx-auto">
              {user?.role === 'CLIENT'
                ? 'Create a project to initiate milestone escrow and invite a freelancer.'
                : 'You have not been assigned to any project yet.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/[0.015] transition group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-base font-bold text-[#1D1D1F] group-hover:text-[#0071E3] transition">
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

                    <p className="text-xs text-[#86868B] line-clamp-1 max-w-2xl">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#86868B] mt-2.5">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      <span>
                        {user?.role === 'CLIENT'
                          ? `Freelancer: ${project.freelancer?.name || 'Unassigned'}`
                          : `Client: ${project.client?.name}`}
                      </span>
                      <span>• {project.milestones?.length || 0} Milestones</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-black/5">
                    <div className="text-left sm:text-right">
                      <span className="text-base font-bold text-[#1D1D1F] block">
                        {formatInr(project.totalBudget)}
                      </span>
                      <span className="text-[11px] text-[#0071E3] font-medium group-hover:underline">
                        Manage Milestones
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
