'use client';

import React from 'react';
import { CreditCard, ArrowDownCircle, BellRing, Clock, AlertCircle, CheckCircle2, Repeat, X } from 'lucide-react';

interface CalendarItem {
  id: string;
  type: 'DEBT_INSTALLMENT' | 'RECEIVABLE_INSTALLMENT' | 'REMINDER';
  title: string;
  description?: string;
  date: string;
  amount?: number;
  currency: string;
  status: string;
  color: string;
  meta: Record<string, any>;
}

interface CalendarDayDetailProps {
  date: Date;
  items: CalendarItem[];
  onClose: () => void;
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAYS_FULL_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function formatCurrency(val: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(val);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'OVERDUE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-danger/15 text-danger">
          <AlertCircle className="w-3 h-3" /> Vadesi Geçmiş
        </span>
      );
    case 'DUE_TODAY':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/15 text-warning">
          <Clock className="w-3 h-3" /> Bugün Vadeli
        </span>
      );
    case 'PAID':
    case 'COLLECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/15 text-success">
          <CheckCircle2 className="w-3 h-3" /> {status === 'PAID' ? 'Ödendi' : 'Tahsil Edildi'}
        </span>
      );
    case 'PLANNED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-info/15 text-info">
          <Clock className="w-3 h-3" /> Planlı
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
          <BellRing className="w-3 h-3" /> Aktif
        </span>
      );
    default:
      return null;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'DEBT_INSTALLMENT':
      return <CreditCard className="w-4 h-4" />;
    case 'RECEIVABLE_INSTALLMENT':
      return <ArrowDownCircle className="w-4 h-4" />;
    case 'REMINDER':
      return <BellRing className="w-4 h-4" />;
    default:
      return null;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'DEBT_INSTALLMENT':
      return 'Borç Taksiti';
    case 'RECEIVABLE_INSTALLMENT':
      return 'Alacak Taksiti';
    case 'REMINDER':
      return 'Hatırlatma';
    default:
      return '';
  }
}

export function CalendarDayDetail({ date, items, onClose }: CalendarDayDetailProps) {
  const debtItems = items.filter(i => i.type === 'DEBT_INSTALLMENT');
  const recvItems = items.filter(i => i.type === 'RECEIVABLE_INSTALLMENT');
  const remItems = items.filter(i => i.type === 'REMINDER');

  const totalDebt = debtItems.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalRecv = recvItems.filter(i => i.status !== 'COLLECTED').reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            {date.getDate()} {MONTHS_TR[date.getMonth()]} {date.getFullYear()}
          </h3>
          <p className="text-sm text-text-muted mt-0.5">
            {DAYS_FULL_TR[date.getDay()]} • {items.length} öğe
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Summary mini-bar */}
      {(totalDebt > 0 || totalRecv > 0) && (
        <div className="px-5 py-3 border-b border-border flex gap-4 flex-wrap">
          {totalDebt > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-text-muted">Borç:</span>
              <span className="text-xs font-semibold text-danger">{formatCurrency(totalDebt)}</span>
            </div>
          )}
          {totalRecv > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-text-muted">Alacak:</span>
              <span className="text-xs font-semibold text-success">{formatCurrency(totalRecv)}</span>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">Bu tarihte kayıt yok</p>
          </div>
        ) : (
          <>
            {/* Debt Installments */}
            {debtItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Borç Taksitleri ({debtItems.length})
                </h4>
                <div className="space-y-2">
                  {debtItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-bg-secondary/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: item.color + '20', color: item.color }}
                          >
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                            {item.meta.creditor && (
                              <p className="text-xs text-text-muted truncate">{item.meta.creditor}</p>
                            )}
                            {item.description && item.description !== item.meta.creditor && (
                              <p className="text-xs text-text-muted truncate mt-0.5">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold" style={{ color: item.status === 'PAID' ? '#64748b' : item.color }}>
                            {item.amount ? formatCurrency(item.amount, item.currency) : ''}
                          </p>
                          <div className="mt-1">{getStatusBadge(item.status)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receivable Installments */}
            {recvItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                  Alacak Taksitleri ({recvItems.length})
                </h4>
                <div className="space-y-2">
                  {recvItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-bg-secondary/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: item.color + '20', color: item.color }}
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                            {item.meta.debtorName && (
                              <p className="text-xs text-text-muted truncate">{item.meta.debtorName}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold" style={{ color: item.status === 'COLLECTED' ? '#64748b' : item.color }}>
                            {item.amount ? formatCurrency(item.amount, item.currency) : ''}
                          </p>
                          <div className="mt-1">{getStatusBadge(item.status)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders */}
            {remItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5" />
                  Hatırlatmalar ({remItems.length})
                </h4>
                <div className="space-y-2">
                  {remItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-bg-secondary/50 hover:bg-bg-card-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: item.color + '20', color: item.color }}
                          >
                            <BellRing className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-text-muted truncate">{item.description}</p>
                            )}
                            {item.meta.isRecurring && (
                              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                <Repeat className="w-3 h-3" />
                                {item.meta.recurrenceRule === 'DAILY' && 'Günlük'}
                                {item.meta.recurrenceRule === 'WEEKLY' && 'Haftalık'}
                                {item.meta.recurrenceRule === 'MONTHLY' && 'Aylık'}
                                {item.meta.recurrenceRule === 'YEARLY' && 'Yıllık'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {item.amount && item.amount > 0 && (
                            <p className="text-sm font-bold" style={{ color: item.color }}>
                              {formatCurrency(item.amount, item.currency)}
                            </p>
                          )}
                          <div className="mt-1">{getStatusBadge(item.status)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
