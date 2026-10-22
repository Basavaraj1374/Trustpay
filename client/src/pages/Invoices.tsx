// ─────────────────────────────────────────────────────────────────────────────
// pages/Invoices.tsx — Official PDF Invoices & Receipt Archive
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatInr } from '../utils/money';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices')
      .then((res) => setInvoices(res.data.invoices))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading PDF. It might still be compiling on the server.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#86868B]">
        <span className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mr-3"></span>
        Loading Invoices...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
          Tax-Compliant PDF Invoices
        </h1>
        <p className="text-xs text-[#86868B] mt-1">
          Official, numbered PDF receipts automatically generated upon milestone escrow release
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-16 text-center text-[#86868B]">
            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3 block">
              receipt_long
            </span>
            <p className="text-base font-bold text-[#1D1D1F]">No invoices issued yet</p>
            <p className="text-xs text-[#86868B] mt-1 max-w-sm mx-auto">
              Invoices are automatically compiled and digitally stamped with status PAID as soon as a client approves and releases milestone escrow.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F7] text-[#86868B] uppercase tracking-wider text-[10px] font-semibold border-b border-black/5">
                <tr>
                  <th className="py-3.5 px-6">Invoice #</th>
                  <th className="py-3.5 px-6">Date Issued</th>
                  <th className="py-3.5 px-6">Project & Deliverable</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-[#1D1D1F]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-black/[0.015] transition">
                    <td className="py-4 px-6 font-mono font-bold text-[#0071E3] whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-6 text-[#86868B] whitespace-nowrap">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-[#1D1D1F]">{inv.project?.title}</p>
                      <p className="text-[11px] text-[#86868B]">
                        Milestone {inv.milestone?.order}: {inv.milestone?.title}
                      </p>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        PAID (VIA ESCROW)
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-sm whitespace-nowrap">
                      {formatInr(inv.amount)}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] border border-black/5 text-xs font-semibold transition"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
