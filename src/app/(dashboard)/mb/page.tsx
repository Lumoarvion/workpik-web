'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, ClipboardList, ChevronRight, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type MBStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type MeasurementType = 'AREA' | 'VOLUME' | 'LENGTH' | 'NOS' | 'LUMP_SUM';

interface MBRow {
  id: string;
  description: string | null;
  nos: number; length: number; breadth: number; height: number;
  qty: number;
}

interface MBItem {
  id: string;
  description: string;
  measurementType: MeasurementType;
  unit: string;
  rate: number | null;
  totalQty: number;
  amount: number;
  sortOrder: number;
  rows: MBRow[];
}

interface MB {
  id: string;
  siteId: string;
  billNumber: string;
  title: string | null;
  status: MBStatus;
  totalAmount: number;
  periodFrom: string | null;
  periodTo: string | null;
  reviewNote: string | null;
  createdAt: string;
  _count?: { items: number };
  items?: MBItem[];
}

interface Site { id: string; name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<MBStatus, 'success' | 'secondary' | 'destructive' | 'default'> = {
  APPROVED: 'success', SUBMITTED: 'default', REJECTED: 'destructive', DRAFT: 'secondary',
};

const STATUS_COLOR: Record<MBStatus, string> = {
  APPROVED: '#16a34a', SUBMITTED: '#3b82f6', REJECTED: '#ef4444', DRAFT: '#6b7280',
};

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  AREA: 'No × L × B', VOLUME: 'No × L × B × H', LENGTH: 'No × L', NOS: 'Count', LUMP_SUM: 'Lump Sum',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtAmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MBPage() {
  const qc = useQueryClient();
  const [siteId, setSiteId] = useState<string>('');
  const [tab, setTab] = useState<'register' | 'pending'>('register');
  const [detail, setDetail] = useState<MB | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBillNumber, setNewBillNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: sites } = useQuery<Site[]>({
    queryKey: ['sites-simple'],
    queryFn: () => api.get('/sites?limit=100').then(r => r.data.data),
  });

  useEffect(() => {
    if (sites?.length && !siteId) setSiteId(sites[0].id);
  }, [sites, siteId]);

  const { data: mbData, isLoading } = useQuery({
    queryKey: ['mb', siteId],
    queryFn: () => api.get(`/sites/${siteId}/mb?limit=100`).then(r => r.data),
    enabled: !!siteId,
  });

  const mbs: MB[] = mbData?.data || [];
  const pending = mbs.filter(m => m.status === 'SUBMITTED');
  const displayed = tab === 'pending' ? pending : mbs;

  // Fetch full detail when dialog opens
  const { data: detailFull, refetch: refetchDetail } = useQuery({
    queryKey: ['mb-detail', siteId, detail?.id],
    queryFn: () => api.get(`/sites/${siteId}/mb/${detail!.id}`).then(r => r.data),
    enabled: !!detail && !!siteId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mb', siteId] });
    if (detail) refetchDetail();
  };

  const approve = useMutation({
    mutationFn: (mbId: string) => api.post(`/sites/${siteId}/mb/${mbId}/approve`),
    onSuccess: () => { invalidate(); toast.success('Bill approved'); setDetail(null); },
    onError: () => toast.error('Failed to approve'),
  });

  const reject = useMutation({
    mutationFn: ({ mbId, note }: { mbId: string; note: string }) =>
      api.post(`/sites/${siteId}/mb/${mbId}/reject`, { note }),
    onSuccess: () => { invalidate(); toast.success('Bill rejected'); setRejectDialogId(null); setDetail(null); setRejectNote(''); },
    onError: () => toast.error('Failed to reject'),
  });

  const createMB = async () => {
    if (!newBillNumber.trim()) return;
    setCreating(true);
    try {
      await api.post(`/sites/${siteId}/mb`, { billNumber: newBillNumber.trim(), title: newTitle.trim() || undefined });
      setCreateOpen(false);
      setNewBillNumber('');
      setNewTitle('');
      invalidate();
      toast.success('Measurement book created');
    } catch { toast.error('Failed to create'); }
    finally { setCreating(false); }
  };

  const deleteMB = useMutation({
    mutationFn: (mbId: string) => api.delete(`/sites/${siteId}/mb/${mbId}`),
    onSuccess: () => { invalidate(); toast.success('Deleted'); },
    onError: () => toast.error('Can only delete DRAFT bills'),
  });

  // Totals
  const totalApproved = mbs.filter(m => m.status === 'APPROVED').reduce((s, m) => s + Number(m.totalAmount), 0);
  const totalPending = pending.reduce((s, m) => s + Number(m.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Measurement Book</h1>
          <p className="text-sm text-gray-500">No × L × B billing register</p>
        </div>
        {siteId && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New Bill
          </Button>
        )}
      </div>

      {/* Site + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={siteId}
          onChange={e => setSiteId(e.target.value)}
        >
          <option value="">— Select Site —</option>
          {(sites || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!siteId ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
          <ClipboardList className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Select a site to view measurement books</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Bills', value: mbs.length },
              { label: 'Pending Review', value: pending.length, accent: pending.length > 0 ? 'text-blue-600' : '' },
              { label: 'Approved Value', value: fmtAmt(totalApproved), accent: 'text-green-600' },
              { label: 'Pending Value', value: fmtAmt(totalPending), accent: totalPending > 0 ? 'text-blue-600' : '' },
            ].map(c => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${c.accent || ''}`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b">
            {(['register', 'pending'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'register' ? 'MB Register' : `Pending Review${pending.length > 0 ? ` (${pending.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <ClipboardList className="h-8 w-8 opacity-30" />
              <p className="text-sm">{tab === 'pending' ? 'No bills pending review' : 'No measurement books yet'}</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Bill No</th>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Period</th>
                      <th className="px-4 py-3 text-center">Items</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(mb => (
                      <tr key={mb.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{mb.billNumber}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{mb.title || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {mb.periodFrom ? `${formatDate(mb.periodFrom)} – ${formatDate(mb.periodTo)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{mb._count?.items ?? 0}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtAmt(Number(mb.totalAmount))}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_VARIANT[mb.status]}>{mb.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDetail(mb)}>
                              View <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                            {mb.status === 'SUBMITTED' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => approve.mutate(mb.id)}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setRejectDialogId(mb.id)}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {mb.status === 'DRAFT' && (
                              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                                onClick={() => { if (confirm('Delete this draft?')) deleteMB.mutate(mb.id); }}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Bill Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.billNumber}
              {detail?.title ? ` — ${detail.title}` : ''}
              <Badge variant={detail ? STATUS_VARIANT[detail.status] : 'secondary'} className="ml-3">
                {detail?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {detailFull && (
            <div className="space-y-4">
              {/* Approve / Reject controls */}
              {detailFull.status === 'SUBMITTED' && (
                <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="flex-1 text-sm text-blue-700 font-medium">This bill is awaiting your review.</p>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approve.mutate(detailFull.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setRejectDialogId(detailFull.id)}>
                    <XCircle className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              )}

              {/* Rejection note */}
              {detailFull.status === 'REJECTED' && detailFull.reviewNote && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-sm text-red-800">
                  <strong>Rejection Note:</strong> {detailFull.reviewNote}
                </div>
              )}

              {/* Spreadsheet table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white text-xs">
                      <th className="px-3 py-2 text-left w-8">No.</th>
                      <th className="px-3 py-2 text-left min-w-[200px]">Description</th>
                      <th className="px-3 py-2 text-center w-10">No</th>
                      <th className="px-3 py-2 text-center w-16">L</th>
                      <th className="px-3 py-2 text-center w-16">B</th>
                      <th className="px-3 py-2 text-center w-16">H</th>
                      <th className="px-3 py-2 text-right w-20">Qty</th>
                      <th className="px-3 py-2 text-center w-12">Unit</th>
                      <th className="px-3 py-2 text-right w-24">Rate</th>
                      <th className="px-3 py-2 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailFull.items || []).map((item: MBItem, itemIdx: number) => (
                      <>
                        {/* Item header row */}
                        <tr key={item.id} className="bg-amber-50 border-t border-amber-200">
                          <td className="px-3 py-1.5 font-bold text-amber-900 text-xs">{itemIdx + 1}.</td>
                          <td className="px-3 py-1.5 font-semibold text-amber-900" colSpan={5}>{item.description}</td>
                          <td className="px-3 py-1.5" colSpan={2} />
                          <td className="px-3 py-1.5 text-right text-xs text-amber-700">
                            {item.rate ? `₹${Number(item.rate).toLocaleString('en-IN')}/${item.unit}` : ''}
                          </td>
                          <td className="px-3 py-1.5" />
                        </tr>

                        {/* Measurement rows */}
                        {item.rows.map((row: MBRow, rowIdx: number) => (
                          <tr key={row.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-3 py-1 text-gray-400 text-xs pl-5" />
                            <td className="px-3 py-1 text-gray-600 text-xs">{row.description || ''}</td>
                            {item.measurementType === 'LUMP_SUM' ? (
                              <>
                                <td className="px-3 py-1 text-center text-gray-700">{fmt(row.nos)}</td>
                                <td colSpan={4} />
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-1 text-center text-gray-700">{fmt(row.nos)}</td>
                                <td className="px-3 py-1 text-center text-gray-700">
                                  {(['AREA', 'VOLUME', 'LENGTH'].includes(item.measurementType)) ? fmt(row.length) : ''}
                                </td>
                                <td className="px-3 py-1 text-center text-gray-700">
                                  {(['AREA', 'VOLUME'].includes(item.measurementType)) ? fmt(row.breadth) : ''}
                                </td>
                                <td className="px-3 py-1 text-center text-gray-700">
                                  {item.measurementType === 'VOLUME' ? fmt(row.height) : ''}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-1 text-right font-medium text-gray-800">{fmt(row.qty)}</td>
                            <td className="px-3 py-1 text-center text-xs text-gray-500">{item.unit}</td>
                            <td />
                            <td />
                          </tr>
                        ))}

                        {/* Item total row */}
                        <tr className="border-b-2 border-gray-300 bg-gray-100">
                          <td className="px-3 py-1.5" />
                          <td className="px-3 py-1.5 font-bold text-gray-700 text-xs uppercase tracking-wide">TOTAL</td>
                          <td colSpan={4} />
                          <td className="px-3 py-1.5 text-right font-bold text-gray-900">
                            {fmt(Number(item.totalQty))}
                          </td>
                          <td className="px-3 py-1.5 text-center text-xs text-gray-500">{item.unit}</td>
                          <td className="px-3 py-1.5 text-right text-xs text-gray-500">
                            {item.rate ? `₹${Number(item.rate).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-gray-900">
                            {item.rate ? fmtAmt(Number(item.amount)) : '—'}
                          </td>
                        </tr>
                      </>
                    ))}

                    {/* Grand total */}
                    <tr className="bg-gray-800 text-white">
                      <td colSpan={9} className="px-3 py-2 text-right font-bold text-sm uppercase tracking-wide">
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-lg">
                        {fmtAmt(Number(detailFull.totalAmount))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!rejectDialogId} onOpenChange={(o) => { if (!o) setRejectDialogId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Bill</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Optionally add a note explaining why this bill is being rejected.</p>
          <textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="e.g. Measurements don't match site drawings. Please re-check Floor 1."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => { setRejectDialogId(null); setRejectNote(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialogId && reject.mutate({ mbId: rejectDialogId, note: rejectNote })}
              disabled={reject.isPending}
            >
              {reject.isPending ? 'Rejecting…' : 'Reject Bill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Bill Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Measurement Book</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Bill Number *</label>
              <Input placeholder="e.g. MB-001, RB-1" value={newBillNumber} onChange={e => setNewBillNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <Input placeholder="e.g. First Running Bill — Tiling Work" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createMB} disabled={creating || !newBillNumber.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
