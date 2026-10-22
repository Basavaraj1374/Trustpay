// ─────────────────────────────────────────────────────────────────────────────
// pages/ProjectDetail.tsx — Milestone Stepper, SHA-256 Contract & Live Chat
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatInr } from '../utils/money';
import { io, Socket } from 'socket.io-client';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'milestones' | 'contract' | 'chat'>('milestones');

  // Milestone Generator State
  const [generating, setGenerating] = useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = useState<any[]>([]);

  // Contract signing state
  const [signingName, setSigningName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // Submission Modal state
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState<number | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');

  // Rejection modal state
  const [rejectingMilestoneId, setRejectingMilestoneId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Dispute modal state
  const [disputingMilestoneId, setDisputingMilestoneId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Mediator resolution state
  const [mediatorResolution, setMediatorResolution] = useState<'RELEASE' | 'REFUND' | 'SPLIT'>('RELEASE');
  const [splitPercent, setSplitPercent] = useState<number>(50);

  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  // Setup Socket.io for Project Chat
  useEffect(() => {
    const token = localStorage.getItem('trustpay_token');
    if (!token || !id) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_project', { projectId: Number(id), token });
    });

    newSocket.on('new_message', (msg: any) => {
      if (msg.projectId === Number(id)) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [id]);

  // ── Milestone Generation ──
  const handleSuggestMilestones = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/milestones/suggest', {
        projectId: project.id,
        totalBudgetRupees: project.totalBudget / 100,
      });
      setSuggestedMilestones(
        res.data.suggestions.map((s: any) => ({
          ...s,
          amountRupees: Math.round((project.totalBudget * s.percentage) / 10000),
        }))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate milestones');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveMilestones = async () => {
    try {
      await api.post('/milestones', {
        projectId: project.id,
        milestones: suggestedMilestones,
      });
      setSuggestedMilestones([]);
      await fetchProject();
      setActiveTab('contract');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save milestones');
    }
  };

  // ── Contract Signing ──
  const handleSignContract = async () => {
    if (!signingName.trim()) return;
    setIsSigning(true);
    try {
      await api.post(`/contracts/${project.id}/sign`, { signedName: signingName });
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Signing failed');
    } finally {
      setIsSigning(false);
    }
  };

  // ── Milestone Actions ──
  const handleFund = async (milestoneId: number) => {
    try {
      await api.patch(`/milestones/${milestoneId}/fund`);
      await refreshUser();
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to fund milestone. Check wallet balance.');
    }
  };

  const handleStartWork = async (milestoneId: number) => {
    try {
      await api.patch(`/milestones/${milestoneId}/start`);
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start milestone');
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingMilestoneId) return;
    try {
      await api.patch(`/milestones/${submittingMilestoneId}/submit`, {
        submissionNote,
        submissionLink: submissionLink || undefined,
      });
      setSubmittingMilestoneId(null);
      setSubmissionNote('');
      setSubmissionLink('');
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Submission failed');
    }
  };

  const handleApprove = async (milestoneId: number) => {
    if (!confirm('Approve milestone and release funds to freelancer wallet immediately?')) {
      return;
    }
    try {
      await api.patch(`/milestones/${milestoneId}/approve`);
      await refreshUser();
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Approval failed');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingMilestoneId) return;
    try {
      await api.patch(`/milestones/${rejectingMilestoneId}/reject`, { reason: rejectReason });
      setRejectingMilestoneId(null);
      setRejectReason('');
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Rejection failed');
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingMilestoneId) return;
    try {
      await api.post('/disputes', {
        milestoneId: disputingMilestoneId,
        reason: disputeReason,
      });
      setDisputingMilestoneId(null);
      setDisputeReason('');
      await fetchProject();
      setActiveTab('chat');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to raise dispute');
    }
  };

  const handleResolveDispute = async (disputeId: number) => {
    try {
      await api.patch(`/disputes/${disputeId}/resolve`, {
        resolution: mediatorResolution,
        splitPercent: mediatorResolution === 'SPLIT' ? splitPercent : null,
      });
      await fetchProject();
      await refreshUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Resolution failed');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    socket.emit('send_message', { projectId: Number(id), text: newMessage });
    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#86868B]">
        <span className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mr-3"></span>
        Loading Mandate Details...
      </div>
    );
  }

  if (!project) return <div className="p-12 text-center text-red-500 font-bold">Project not found</div>;

  const isClient = user?.id === project.clientId;
  const isFreelancer = user?.id === project.freelancerId;
  const isMediator = user?.role === 'MEDIATOR';

  return (
    <div className="space-y-6">
      {/* 1. Project Title & Tab Switcher Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                {project.title}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                project.status === 'ACTIVE'
                  ? 'bg-blue-50 text-[#0071E3]'
                  : project.status === 'COMPLETED'
                  ? 'bg-emerald-50 text-[#34C759]'
                  : 'bg-amber-50 text-[#FF9F0A]'
              }`}>
                {project.status}
              </span>
            </div>

            <p className="text-xs text-[#86868B] mt-2 max-w-2xl leading-relaxed">
              {project.description}
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-[#86868B] mt-4 pt-3 border-t border-black/5">
              <span>Client: <strong className="text-[#1D1D1F]">{project.client?.name}</strong></span>
              <span>Freelancer: <strong className="text-[#1D1D1F]">{project.freelancer?.name || 'Unassigned'}</strong></span>
              <span>Total Budget: <strong className="text-[#1D1D1F]">{formatInr(project.totalBudget)}</strong></span>
            </div>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="flex items-center gap-1 bg-black/5 p-1 rounded-full self-start md:self-auto">
            <button
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeTab === 'milestones'
                  ? 'bg-white text-[#1D1D1F] shadow-sm'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_box</span>
              Milestones ({project.milestones?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('contract')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeTab === 'contract'
                  ? 'bg-white text-[#1D1D1F] shadow-sm'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              Contract {project.contract?.locked && '🔒'}
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeTab === 'chat'
                  ? 'bg-white text-[#1D1D1F] shadow-sm'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">forum</span>
              Chat & Disputes
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: MILESTONES ────────────────────────────────────────────────── */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          {/* Milestone Generator Prompt if DRAFT & Client */}
          {project.milestones.length === 0 && isClient && (
            <div className="bg-white p-10 rounded-3xl border border-dashed border-black/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
              </div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">Generate Milestone Breakdown</h2>
              <p className="text-xs text-[#86868B] max-w-md mx-auto leading-relaxed">
                Automatically generate an industry-standard 3 to 5 milestone deliverable schedule summing to {formatInr(project.totalBudget)}.
              </p>

              {suggestedMilestones.length === 0 ? (
                <button
                  onClick={handleSuggestMilestones}
                  disabled={generating}
                  className="px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {generating ? 'Formulating Schedule...' : 'Generate Milestones'}
                </button>
              ) : (
                <div className="space-y-4 text-left max-w-2xl mx-auto pt-4">
                  {suggestedMilestones.map((ms, idx) => (
                    <div key={idx} className="p-4 border border-black/5 rounded-2xl bg-[#F5F5F7] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-[#0071E3]">Milestone {idx + 1}</span>
                        <span className="text-xs font-bold bg-white text-[#1D1D1F] px-2.5 py-0.5 rounded-full border border-black/5">
                          ₹{ms.amountRupees}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={ms.title}
                        onChange={(e) => {
                          const copy = [...suggestedMilestones];
                          copy[idx].title = e.target.value;
                          setSuggestedMilestones(copy);
                        }}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-black/5 bg-white outline-none"
                      />
                      <input
                        type="text"
                        value={ms.deliverables}
                        placeholder="Deliverables"
                        onChange={(e) => {
                          const copy = [...suggestedMilestones];
                          copy[idx].deliverables = e.target.value;
                          setSuggestedMilestones(copy);
                        }}
                        className="w-full text-xs p-2.5 rounded-xl border border-black/5 bg-white text-[#86868B] outline-none"
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setSuggestedMilestones([])}
                      className="px-4 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F]"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveMilestones}
                      className="px-6 py-2.5 rounded-full bg-[#34C759] hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition"
                    >
                      Confirm Schedule & Generate Contract
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List of Confirmed Milestones */}
          <div className="space-y-4">
            {project.milestones.map((ms: any) => {
              const isPending = ms.status === 'PENDING';
              const isFunded = ms.status === 'FUNDED';
              const isInProgress = ms.status === 'IN_PROGRESS';
              const isSubmitted = ms.status === 'SUBMITTED';
              const isReleased = ms.status === 'RELEASED';
              const isRejected = ms.status === 'REJECTED';
              const isDisputed = ms.status === 'DISPUTED';

              return (
                <div
                  key={ms.id}
                  className={`bg-white p-6 sm:p-7 rounded-3xl border transition shadow-sm ${
                    isDisputed
                      ? 'border-red-200 bg-red-50/20'
                      : isReleased
                      ? 'border-emerald-100'
                      : 'border-black/5'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-[#86868B]">
                          #{ms.order}
                        </span>
                        <h3 className="text-base font-bold text-[#1D1D1F]">{ms.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isReleased ? 'bg-emerald-100 text-emerald-800' :
                          isDisputed ? 'bg-red-100 text-red-800' :
                          isSubmitted ? 'bg-purple-100 text-purple-800' :
                          isFunded || isInProgress ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ms.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#86868B]">{ms.description}</p>
                      <p className="text-xs text-[#1D1D1F] pt-1">
                        <strong>Deliverables:</strong> {ms.deliverables}
                      </p>

                      {ms.submissionNote && (
                        <div className="mt-3 p-4 bg-purple-50/60 border border-purple-100 rounded-2xl text-xs text-purple-900 space-y-1">
                          <p><strong>Freelancer Submission:</strong> {ms.submissionNote}</p>
                          {ms.submissionLink && (
                            <a
                              href={ms.submissionLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#0071E3] hover:underline font-bold"
                            >
                              View Submission Link
                              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                            </a>
                          )}
                          {ms.autoApproveAt && (
                            <p className="text-purple-600 font-semibold pt-1">
                              ⏳ Auto-approves on: {new Date(ms.autoApproveAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-3 shrink-0">
                      <span className="text-xl font-extrabold text-[#1D1D1F]">
                        {formatInr(ms.amount)}
                      </span>

                      {/* State Machine Action Controls */}
                      <div className="flex flex-wrap gap-2 justify-end">
                        {isPending && isClient && project.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleFund(ms.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-[15px]">lock</span>
                            Lock Escrow Funds
                          </button>
                        )}

                        {isFunded && isFreelancer && (
                          <button
                            onClick={() => handleStartWork(ms.id)}
                            className="px-4 py-2 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold transition active:scale-[0.98]"
                          >
                            Start Work
                          </button>
                        )}

                        {(isInProgress || isRejected) && isFreelancer && (
                          <button
                            onClick={() => setSubmittingMilestoneId(ms.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-[15px]">send</span>
                            Submit Deliverables
                          </button>
                        )}

                        {isSubmitted && isClient && (
                          <>
                            <button
                              onClick={() => setRejectingMilestoneId(ms.id)}
                              className="px-3.5 py-2 rounded-full bg-black/5 hover:bg-black/10 text-[#1D1D1F] text-xs font-semibold transition"
                            >
                              Request Revision
                            </button>
                            <button
                              onClick={() => handleApprove(ms.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#34C759] hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Approve & Release
                            </button>
                          </>
                        )}

                        {isReleased && (
                          <Link
                            to="/invoices"
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition"
                          >
                            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                            View Invoice
                          </Link>
                        )}

                        {(isInProgress || isSubmitted) && !isDisputed && (
                          <button
                            onClick={() => setDisputingMilestoneId(ms.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-[#FF3B30] hover:bg-red-50 text-xs font-semibold transition"
                          >
                            <span className="material-symbols-outlined text-[15px]">warning</span>
                            Raise Dispute
                          </button>
                        )}

                        {isDisputed && isMediator && (
                          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-left space-y-2 mt-2">
                            <p className="text-xs font-bold text-amber-900">Mediator Arbitration Panel</p>
                            <div className="flex gap-1.5">
                              {(['RELEASE', 'REFUND', 'SPLIT'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setMediatorResolution(mode)}
                                  className={`px-2.5 py-1 text-[11px] rounded-full font-bold transition ${
                                    mediatorResolution === mode
                                      ? 'bg-amber-800 text-white'
                                      : 'bg-white border text-amber-900'
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>

                            {mediatorResolution === 'SPLIT' && (
                              <div className="text-xs pt-1">
                                <span>Freelancer Share: {splitPercent}%</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={splitPercent}
                                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                                  className="w-full mt-1"
                                />
                              </div>
                            )}

                            <button
                              onClick={() => handleResolveDispute(ms.dispute?.id)}
                              className="w-full py-1.5 rounded-full bg-[#34C759] hover:bg-emerald-600 text-white text-xs font-bold transition"
                            >
                              Execute Resolution
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: DIGITAL CONTRACT ────────────────────────────────────────── */}
      {activeTab === 'contract' && (
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1D1D1F]">Cryptographic Escrow Agreement</h2>
              <p className="text-[11px] font-mono text-[#86868B] mt-1 break-all">
                SHA-256 Hash: {project.contract?.hash || 'Not generated yet'}
              </p>
            </div>
            {project.contract?.locked && (
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0071E3] px-3.5 py-1.5 rounded-full text-xs font-bold border border-blue-200">
                <span className="material-symbols-outlined text-[15px]">lock</span>
                Scope Locked & Signed
              </span>
            )}
          </div>

          <div className="p-6 bg-[#F5F5F7] rounded-2xl text-xs leading-relaxed font-mono whitespace-pre-wrap text-[#1D1D1F] border border-black/5 max-h-[400px] overflow-y-auto">
            {project.contract?.text || 'Contract will compile once project milestones are created...'}
          </div>

          {/* Signature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5">
            <div className={`p-4 rounded-2xl border ${project.contract?.clientSigned ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#F5F5F7] border-black/5'}`}>
              <p className="text-xs font-bold text-[#1D1D1F]">Client Digital Signature</p>
              {project.contract?.clientSigned ? (
                <div className="text-xs text-emerald-800 mt-1.5 space-y-0.5">
                  <p className="font-bold">Signed by: {project.contract.clientSignedName}</p>
                  <p className="text-[#86868B] text-[11px]">{new Date(project.contract.clientSignedAt).toLocaleString()}</p>
                  <p className="text-[#86868B] font-mono text-[10px]">IP: {project.contract.clientIp}</p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 mt-1">Awaiting client signature</p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${project.contract?.freelancerSigned ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#F5F5F7] border-black/5'}`}>
              <p className="text-xs font-bold text-[#1D1D1F]">Freelancer Digital Signature</p>
              {project.contract?.freelancerSigned ? (
                <div className="text-xs text-emerald-800 mt-1.5 space-y-0.5">
                  <p className="font-bold">Signed by: {project.contract.freelancerSignedName}</p>
                  <p className="text-[#86868B] text-[11px]">{new Date(project.contract.freelancerSignedAt).toLocaleString()}</p>
                  <p className="text-[#86868B] font-mono text-[10px]">IP: {project.contract.freelancerIp}</p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 mt-1">Awaiting freelancer signature</p>
              )}
            </div>
          </div>

          {/* Signing Form */}
          {!project.contract?.locked && (
            <div className="pt-4 border-t border-black/5 bg-blue-50/40 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1">
                Execute Digital Signature
              </h3>
              <p className="text-xs text-[#86868B] mb-4">
                Type your full legal name below to execute this contract. Once signed by both parties, project scope is cryptographically locked.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="Your Full Legal Name"
                  value={signingName}
                  onChange={(e) => setSigningName(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white border border-black/10 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                />
                <button
                  onClick={handleSignContract}
                  disabled={isSigning || !signingName.trim()}
                  className="px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isSigning ? 'Signing...' : 'Sign Agreement'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: LIVE DISPUTE CHAT ───────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm flex flex-col h-[520px] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-black/5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1F]">Project Dispute Channel</h2>
              <p className="text-xs text-[#86868B]">Real-time room for client, freelancer, and mediator</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse"></span>
              Live Channel
            </span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#86868B]">
                No messages yet. Send a message to communicate with the other party or mediator.
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-bold text-[#86868B] mb-0.5 px-1">
                      {m.sender?.name} ({m.sender?.role})
                    </span>
                    <div className={`p-3 rounded-2xl text-xs max-w-sm ${
                      isMe
                        ? 'bg-[#0071E3] text-white rounded-tr-none'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-black/5 flex gap-2 bg-[#F5F5F7]">
            <input
              type="text"
              placeholder="Type message or dispute argument..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs rounded-full border border-black/10 bg-white outline-none focus:ring-2 focus:ring-[#0071E3]/20"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Send
            </button>
          </form>
        </div>
      )}

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* Deliverable Submission Modal */}
      {submittingMilestoneId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-7 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-black/5">
            <h3 className="text-base font-bold text-[#1D1D1F]">Submit Deliverables for Review</h3>
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1">
                  Deliverable Summary
                </label>
                <textarea
                  required
                  rows={3}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Detail completed tasks according to the milestone criteria..."
                  className="w-full text-xs p-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1">
                  Proof / Work Link (GitHub, Figma, Drive)
                </label>
                <input
                  type="url"
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs p-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingMilestoneId(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {rejectingMilestoneId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-7 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-black/5">
            <h3 className="text-base font-bold text-[#1D1D1F]">Request Scope Revision</h3>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1">
                  Revision Feedback
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain deliverables that require changes or corrections..."
                  className="w-full text-xs p-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingMilestoneId(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#FF3B30] hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputingMilestoneId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-7 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-black/5">
            <div className="flex items-center gap-2 text-[#FF3B30]">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="text-base font-bold text-[#1D1D1F]">Raise Milestone Dispute</h3>
            </div>
            <p className="text-xs text-[#86868B]">
              Filing a dispute immediately freezes this milestone's funds. A mediator will arbitrate based on the agreed digital contract.
            </p>
            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-1">
                  Reason for Dispute
                </label>
                <textarea
                  required
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Detail breach of deliverables, unresponsive party, or scope mismatch..."
                  className="w-full text-xs p-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputingMilestoneId(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#FF3B30] hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  Freeze Funds & Notify Mediator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
