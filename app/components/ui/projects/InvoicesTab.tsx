'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectInvoiceStatus } from '@/app/admin/(portal)/projects/data';
import { markInvoicePaid } from '@/app/admin/(portal)/invoices/actions';
import { MoreHorizontal, Eye, CreditCard, Loader2 } from 'lucide-react';

interface InvoicesTabProps {
  project: Project;
}

const STATUS_LABEL: Record<ProjectInvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  due_soon: 'Due Soon',
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Partial',
};

const STATUS_BADGE: Record<ProjectInvoiceStatus, string> = {
  draft: 'text-gray-600 bg-gray-100',
  sent: 'text-blue-700 bg-blue-50',
  due_soon: 'text-red-600 bg-red-50',
  paid: 'text-emerald-700 bg-emerald-50',
  overdue: 'text-red-700 bg-red-100',
  partial: 'text-amber-700 bg-amber-50',
};

function fmtCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function InvoicesTab({ project }: InvoicesTabProps) {
  const router = useRouter();
  const invoices = project.details?.invoices ?? [];

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handlePayNow(invoiceId: string, amount: number) {
    setActiveMenu(null);
    setError(null);
    setPayingId(invoiceId);
    startTransition(async () => {
      // Records the payment against the invoice; the detail page is server
      // rendered, so a refresh is what brings the new status back into the tab.
      const res = await markInvoicePaid(invoiceId, 'card', amount);
      setPayingId(null);
      if ('error' in res) {
        setError(res.error ?? 'Could not record this payment.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 m-4 md:m-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Invoices</h3>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="overflow-x-auto relative min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
              <th className="pb-4 font-semibold w-40">Invoice ID</th>
              <th className="pb-4 font-semibold">Name</th>
              <th className="pb-4 font-semibold w-40">Amount</th>
              <th className="pb-4 font-semibold w-40 text-center">Status</th>
              <th className="pb-4 font-semibold w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                  No invoices raised for this project yet.
                </td>
              </tr>
            )}

            {invoices.map((invoice) => {
              const isOpen = activeMenu === invoice.id;
              const isPaying = payingId === invoice.id && isPending;

              return (
                <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 text-sm text-gray-600">{invoice.code}</td>
                  <td className="py-4 text-sm font-medium text-gray-900">{invoice.clientName}</td>
                  <td className="py-4 text-sm font-medium text-gray-900">{fmtCurrency(invoice.amount)}</td>
                  <td className="py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[invoice.status]}`}
                    >
                      {STATUS_LABEL[invoice.status]}
                    </span>
                  </td>
                  <td className="py-4 text-right relative">
                    {isPaying ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin inline-block" />
                    ) : (
                      <button
                        onClick={() => setActiveMenu(isOpen ? null : invoice.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label={`Actions for invoice ${invoice.code}`}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    )}

                    {isOpen && (
                      <div
                        ref={menuRef}
                        className="absolute top-10 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 text-left"
                      >
                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            router.push(`/admin/invoices?invoice=${invoice.id}`);
                          }}
                          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-gray-400" /> View Invoice
                        </button>
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => handlePayNow(invoice.id, invoice.amount)}
                            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          >
                            <CreditCard className="w-4 h-4 text-gray-400" /> Pay Now
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
