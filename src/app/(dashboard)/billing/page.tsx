'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DollarSign, Calendar, Cloud, Users, Package, Wrench, Plus,
  Loader2, Trash2, Sun, CloudRain, CloudLightning, Wind, Thermometer,
  Eye, Download, CheckCircle2, XCircle, IndianRupee, ClipboardList,
  TrendingUp, Image as ImageIcon, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── helpers ──────────────────────────────────────────────────────────────────
const weatherIcons: Record<string, any> = {
  CLEAR: Sun, CLOUDY: Cloud, RAIN: CloudRain, STORM: CloudLightning,
  WINDY: Wind, HOT: Thermometer, OTHER: Cloud,
};
const WEATHER_EMOJI: Record<string, string> = {
  CLEAR: '☀️', CLOUDY: '☁️', RAIN: '🌧️', STORM: '⛈️', WINDY: '💨', HOT: '🌡️', OTHER: '🌤️',
};

function fmt(n: number | null | undefined) {
  if (n == null || n === 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}
function fmtShort(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}
function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

const TRADES = ['Concrete', 'Masonry', 'Woodwork', 'Electrical', 'Plumbing', 'Roofing', 'Drainage', 'Painting', 'Steel / Structural', 'General'];
const TRADE_COLORS: Record<string, string> = {
  'Concrete': 'bg-slate-100 text-slate-700', 'Masonry': 'bg-orange-100 text-orange-700',
  'Woodwork': 'bg-amber-100 text-amber-700', 'Electrical': 'bg-yellow-100 text-yellow-700',
  'Plumbing': 'bg-blue-100 text-blue-700', 'Roofing': 'bg-indigo-100 text-indigo-700',
  'Drainage': 'bg-cyan-100 text-cyan-700', 'Painting': 'bg-pink-100 text-pink-700',
  'Steel / Structural': 'bg-gray-100 text-gray-700', 'General': 'bg-green-100 text-green-700',
};
function tradeBadge(trade: string) {
  return TRADE_COLORS[trade] ?? 'bg-purple-100 text-purple-700';
}

type MainTab = 'register' | 'payroll' | 'breakdown';

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const qc = useQueryClient();

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // View state
  const [mainTab, setMainTab] = useState<MainTab>('register');
  const [viewLogId, setViewLogId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newLog, setNewLog] = useState({ logDate: new Date().toISOString().split('T')[0], weather: '', crewCount: '', workSummary: '' });

  // Detail dialog tabs & forms
  const [activeTab, setActiveTab] = useState<'materials' | 'labour' | 'equipment'>('materials');
  const [equipForm, setEquipForm] = useState({ name: '', type: 'RENTED', hoursUsed: '', rentalCostPerHour: '', totalCost: '' });
  const [matForm, setMatForm] = useState({ item: '', quantity: '', unit: 'Bags', unitCost: '', totalCost: '', vendor: '', invoiceNumber: '', trade: '' });
  const [labForm, setLabForm] = useState({ workerName: '', role: '', hoursWorked: '', dailyWage: '', trade: '' });
  const [photoView, setPhotoView] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: sites } = useQuery({
    queryKey: ['sites-list'],
    queryFn: () => api.get('/sites', { params: { limit: 100 } }).then((r) => r.data),
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['billing-logs', selectedSiteId, dateFrom, dateTo],
    queryFn: () => api.get(`/sites/${selectedSiteId}/billing`, {
      params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, limit: 60 },
    }).then((r) => r.data),
    enabled: !!selectedSiteId,
  });

  const { data: summary } = useQuery({
    queryKey: ['billing-summary', selectedSiteId, dateFrom, dateTo],
    queryFn: () => api.get(`/sites/${selectedSiteId}/billing-summary`, {
      params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    }).then((r) => r.data),
    enabled: !!selectedSiteId,
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ['billing-payroll', selectedSiteId, dateFrom, dateTo],
    queryFn: () => api.get(`/sites/${selectedSiteId}/billing-payroll`, {
      params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    }).then((r) => r.data),
    enabled: !!selectedSiteId && mainTab === 'payroll',
  });

  const { data: logDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['billing-log-detail', selectedSiteId, viewLogId],
    queryFn: () => api.get(`/sites/${selectedSiteId}/billing/${viewLogId}`).then((r) => r.data),
    enabled: !!viewLogId && !!selectedSiteId,
  });

  const { data: tradeSummary } = useQuery({
    queryKey: ['billing-trade-summary', selectedSiteId, viewLogId],
    queryFn: () => api.get(`/sites/${selectedSiteId}/billing/${viewLogId}/trade-summary`).then((r) => r.data),
    enabled: !!viewLogId && !!selectedSiteId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createLog = useMutation({
    mutationFn: () => api.post(`/sites/${selectedSiteId}/billing`, {
      logDate: newLog.logDate,
      weather: newLog.weather || undefined,
      crewCount: newLog.crewCount ? parseInt(newLog.crewCount) : undefined,
      workSummary: newLog.workSummary || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      setShowCreate(false);
      setNewLog({ logDate: new Date().toISOString().split('T')[0], weather: '', crewCount: '', workSummary: '' });
      toast.success('Daily log created');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const addEquipment = useMutation({
    mutationFn: () => api.post(`/sites/${selectedSiteId}/billing/${viewLogId}/equipment`, {
      name: equipForm.name, type: equipForm.type,
      hoursUsed: equipForm.hoursUsed ? parseFloat(equipForm.hoursUsed) : undefined,
      rentalCostPerHour: equipForm.rentalCostPerHour ? parseFloat(equipForm.rentalCostPerHour) : undefined,
      totalCost: equipForm.totalCost ? parseFloat(equipForm.totalCost) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-log-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      setEquipForm({ name: '', type: 'RENTED', hoursUsed: '', rentalCostPerHour: '', totalCost: '' });
      toast.success('Equipment added');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const addMaterial = useMutation({
    mutationFn: () => api.post(`/sites/${selectedSiteId}/billing/${viewLogId}/materials`, {
      item: matForm.item,
      quantity: parseFloat(matForm.quantity),
      unit: matForm.unit,
      unitCost: matForm.unitCost ? parseFloat(matForm.unitCost) : undefined,
      totalCost: matForm.totalCost ? parseFloat(matForm.totalCost)
        : (matForm.unitCost && matForm.quantity ? parseFloat(matForm.unitCost) * parseFloat(matForm.quantity) : undefined),
      vendor: matForm.vendor || undefined,
      invoiceNumber: matForm.invoiceNumber || undefined,
      trade: matForm.trade || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-log-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      qc.invalidateQueries({ queryKey: ['billing-trade-summary'] });
      setMatForm({ item: '', quantity: '', unit: 'Bags', unitCost: '', totalCost: '', vendor: '', invoiceNumber: '', trade: '' });
      toast.success('Material added');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const addLabour = useMutation({
    mutationFn: () => api.post(`/sites/${selectedSiteId}/billing/${viewLogId}/labour`, {
      workerName: labForm.workerName, role: labForm.role,
      hoursWorked: labForm.hoursWorked ? parseFloat(labForm.hoursWorked) : undefined,
      dailyWage: labForm.dailyWage ? parseFloat(labForm.dailyWage) : undefined,
      trade: labForm.trade || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-log-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      qc.invalidateQueries({ queryKey: ['billing-payroll'] });
      setLabForm({ workerName: '', role: '', hoursWorked: '', dailyWage: '', trade: '' });
      toast.success('Worker added');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteEntry = async (type: string, id: string) => {
    try {
      await api.delete(`/sites/${selectedSiteId}/billing/${viewLogId}/${type}/${id}`);
      qc.invalidateQueries({ queryKey: ['billing-log-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      if (type === 'labour') qc.invalidateQueries({ queryKey: ['billing-payroll'] });
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const togglePaid = async (labourId: string, paid: boolean) => {
    try {
      await api.patch(`/sites/${selectedSiteId}/billing/${viewLogId}/labour/${labourId}/paid`, { paid });
      qc.invalidateQueries({ queryKey: ['billing-log-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      qc.invalidateQueries({ queryKey: ['billing-payroll'] });
      toast.success(paid ? 'Marked as paid ✓' : 'Marked as unpaid');
    } catch { toast.error('Failed to update'); }
  };

  const markAllPaid = async (logId: string, paid: boolean) => {
    try {
      await api.patch(`/sites/${selectedSiteId}/billing/${logId}/labour/mark-all-paid`, { paid });
      qc.invalidateQueries({ queryKey: ['billing-log-detail'] });
      qc.invalidateQueries({ queryKey: ['billing-logs'] });
      qc.invalidateQueries({ queryKey: ['billing-payroll'] });
      toast.success(paid ? 'All workers marked as paid' : 'All workers marked as unpaid');
    } catch { toast.error('Failed'); }
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const budget = summary?.budget ?? null;
  const grandTotal = summary?.summary?.grandTotal ?? 0;
  const budgetUsedPct = budget ? Math.min(Math.round((grandTotal / budget) * 100), 100) : null;

  // Compute day-total for detail dialog
  const detailTotal = logDetail ? (
    (logDetail.materialLogs?.reduce((s: number, m: any) => s + Number(m.totalCost || 0), 0) || 0) +
    (logDetail.equipmentLogs?.reduce((s: number, e: any) => s + Number(e.totalCost || 0), 0) || 0) +
    (logDetail.labourLogs?.reduce((s: number, l: any) => s + Number(l.dailyWage || 0), 0) || 0)
  ) : 0;

  const downloadCSV = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get(`/sites/${selectedSiteId}/billing-export?${params}`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a'); a.href = url;
        a.download = `billing-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); window.URL.revokeObjectURL(url);
        toast.success('CSV downloaded');
      })
      .catch(() => toast.error('Export failed'));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Daily costs, payroll register and spend breakdown</p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              options={[{ value: '', label: 'Select Site' }, ...(sites?.data?.map((s: any) => ({ value: s.id, label: s.name })) || [])]}
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-52"
            />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
            <span className="text-xs text-gray-400">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
            {selectedSiteId && (
              <>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1" />New Daily Log
                </Button>
                <Button size="sm" variant="outline" onClick={downloadCSV}>
                  <Download className="h-4 w-4 mr-1" />Export CSV
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedSiteId ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3" />
          <p className="text-lg font-medium">Select a site to view billing</p>
        </div>
      ) : (
        <>
          {/* ── Budget bar ── */}
          {budget != null && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Project Budget</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{fmtShort(grandTotal)}</span>
                    <span className="text-sm text-gray-400"> / {fmtShort(budget)}</span>
                    <span className={`ml-2 text-xs font-bold ${budgetUsedPct! >= 90 ? 'text-red-600' : budgetUsedPct! >= 70 ? 'text-orange-500' : 'text-green-600'}`}>
                      {budgetUsedPct}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${budgetUsedPct! >= 90 ? 'bg-red-500' : budgetUsedPct! >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                    style={{ width: `${budgetUsedPct}%` }}
                  />
                </div>
                {budgetUsedPct! >= 90 && (
                  <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Budget nearly exhausted</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Summary cards ── */}
          {summary?.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Materials', value: fmt(summary.summary.totalMaterial), icon: Package, cls: 'bg-blue-100 text-blue-600' },
                { label: 'Equipment', value: fmt(summary.summary.totalEquipment), icon: Wrench, cls: 'bg-amber-100 text-amber-600' },
                { label: 'Labour', value: fmt(summary.summary.totalLabour), icon: Users, cls: 'bg-purple-100 text-purple-600' },
                { label: 'Grand Total', value: fmt(summary.summary.grandTotal), icon: DollarSign, cls: 'bg-green-100 text-green-600' },
                { label: 'Days Logged', value: summary.summary.daysLogged, icon: Calendar, cls: 'bg-gray-100 text-gray-600' },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.cls}`}>
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-lg font-bold">{s.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Main tab bar ── */}
          <div className="flex gap-1 border-b border-gray-200">
            {([
              { key: 'register', label: 'Daily Register', icon: ClipboardList },
              { key: 'payroll', label: 'Payroll', icon: Users },
              { key: 'breakdown', label: 'Spend Breakdown', icon: TrendingUp },
            ] as { key: MainTab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setMainTab(key)}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════════════════
              TAB 1 — DAILY REGISTER
          ════════════════════════════════════════════════════════ */}
          {mainTab === 'register' && (
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
                ) : !logs?.data?.length ? (
                  <div className="p-8 text-center text-gray-400">
                    <Calendar className="h-10 w-10 mx-auto mb-2" />
                    <p>No daily logs yet. Create one to start tracking.</p>
                  </div>
                ) : (
                  <>
                    {/* Table header */}
                    <div className="hidden lg:grid grid-cols-[90px_40px_60px_1fr_1fr_1fr_1fr_80px] gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span>Date</span>
                      <span></span>
                      <span>Crew</span>
                      <span>Materials</span>
                      <span>Equipment</span>
                      <span>Labour</span>
                      <span className="font-bold text-gray-700">Day Total</span>
                      <span></span>
                    </div>
                    <div className="divide-y">
                      {logs.data.map((log: any) => {
                        const dayTotal = (log.totalMaterial || 0) + (log.totalEquipment || 0) + (log.totalLabour || 0);
                        const WeatherIcon = weatherIcons[log.weather] || Cloud;
                        const hasUnpaid = (log.totalLabourUnpaid || 0) > 0;
                        return (
                          <div
                            key={log.id}
                            className="grid grid-cols-1 lg:grid-cols-[90px_40px_60px_1fr_1fr_1fr_1fr_80px] gap-2 items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => { setViewLogId(log.id); setActiveTab('materials'); }}
                          >
                            {/* Date */}
                            <div className="flex items-center gap-2 lg:block">
                              <p className="text-base font-bold text-gray-900">
                                {new Date(log.logDate).getDate()}{' '}
                                <span className="text-xs text-gray-500 font-normal">
                                  {new Date(log.logDate).toLocaleDateString('en', { month: 'short' })}
                                </span>
                              </p>
                              <p className="text-xs text-gray-400 lg:hidden">
                                {log.workSummary?.slice(0, 40)}
                              </p>
                            </div>
                            {/* Weather */}
                            <span className="hidden lg:block text-lg" title={log.weather}>{WEATHER_EMOJI[log.weather] || ''}</span>
                            {/* Crew */}
                            <span className="hidden lg:block text-sm text-gray-600">{log.crewCount != null ? `${log.crewCount} 👷` : '—'}</span>
                            {/* Materials */}
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-blue-400 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">{fmt(log.totalMaterial)}</span>
                            </div>
                            {/* Equipment */}
                            <div className="flex items-center gap-1">
                              <Wrench className="h-3 w-3 text-amber-400 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">{fmt(log.totalEquipment)}</span>
                            </div>
                            {/* Labour */}
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-purple-400 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">{fmt(log.totalLabour)}</span>
                              {hasUnpaid && (
                                <span className="ml-1 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                                  Unpaid
                                </span>
                              )}
                            </div>
                            {/* Day total */}
                            <span className="text-sm font-bold text-gray-900">{dayTotal > 0 ? fmtShort(dayTotal) : '—'}</span>
                            {/* Action */}
                            <Button variant="outline" size="sm" className="hidden lg:flex">
                              <Eye className="h-3.5 w-3.5 mr-1" />View
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    {/* Running total footer */}
                    {summary?.summary && (
                      <div className="grid grid-cols-1 lg:grid-cols-[90px_40px_60px_1fr_1fr_1fr_1fr_80px] gap-2 items-center px-4 py-3 bg-gray-50 border-t font-semibold text-sm">
                        <span className="text-gray-500 uppercase text-xs tracking-wide col-span-3">Period Total</span>
                        <span className="text-blue-700">{fmtShort(summary.summary.totalMaterial)}</span>
                        <span className="text-amber-700">{fmtShort(summary.summary.totalEquipment)}</span>
                        <span className="text-purple-700">{fmtShort(summary.summary.totalLabour)}</span>
                        <span className="text-green-700 font-bold">{fmtShort(summary.summary.grandTotal)}</span>
                        <span />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2 — PAYROLL REGISTER
          ════════════════════════════════════════════════════════ */}
          {mainTab === 'payroll' && (
            <div className="space-y-4">
              {payrollLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
              ) : !payroll?.byRole?.length ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-400">
                    <Users className="h-10 w-10 mx-auto mb-2" />
                    <p>No labour entries found for this period.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Payroll summary bar */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Payroll</p>
                        <p className="text-2xl font-bold text-gray-900">{fmtShort(payroll.totalAmount)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paid Out</p>
                        <p className="text-2xl font-bold text-green-600">{fmtShort(payroll.paidAmount)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center border border-orange-200 bg-orange-50">
                        <p className="text-xs text-orange-700 uppercase tracking-wide mb-1 font-semibold">Outstanding</p>
                        <p className="text-2xl font-bold text-orange-600">{fmtShort(payroll.unpaidAmount)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Per-role breakdown */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="grid grid-cols-[1fr_80px_80px_100px_100px_100px] gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <span>Role</span>
                        <span className="text-center">Entries</span>
                        <span className="text-center">Workers</span>
                        <span className="text-right">Total</span>
                        <span className="text-right text-green-700">Paid</span>
                        <span className="text-right text-orange-600">Outstanding</span>
                      </div>
                      <div className="divide-y">
                        {payroll.byRole.map((r: any) => (
                          <div key={r.role} className="grid grid-cols-[1fr_80px_80px_100px_100px_100px] gap-2 items-center px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{r.role}</p>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-green-400"
                                  style={{ width: `${pct(r.paidAmount, r.totalAmount)}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-center text-sm text-gray-600">{r.entries}</span>
                            <span className="text-center text-sm text-gray-600">{r.totalWorkers}</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{fmt(r.totalAmount)}</span>
                            <span className="text-right text-sm font-semibold text-green-700">{r.paidAmount > 0 ? fmt(r.paidAmount) : '—'}</span>
                            <span className="text-right text-sm font-semibold text-orange-600">{r.unpaidAmount > 0 ? fmt(r.unpaidAmount) : '—'}</span>
                          </div>
                        ))}
                      </div>
                      {/* Totals footer */}
                      <div className="grid grid-cols-[1fr_80px_80px_100px_100px_100px] gap-2 items-center px-4 py-3 bg-gray-50 border-t font-bold text-sm">
                        <span className="text-gray-600">Total</span>
                        <span className="text-center text-gray-600">{payroll.totalEntries}</span>
                        <span />
                        <span className="text-right text-gray-900">{fmt(payroll.totalAmount)}</span>
                        <span className="text-right text-green-700">{fmt(payroll.paidAmount)}</span>
                        <span className="text-right text-orange-600">{fmt(payroll.unpaidAmount)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-xs text-gray-400 text-center">
                    To mark workers as paid, open a daily log from the Register tab and toggle the Paid status on each labour entry.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 3 — SPEND BREAKDOWN
          ════════════════════════════════════════════════════════ */}
          {mainTab === 'breakdown' && (
            <Card>
              <CardContent className="p-0">
                {!summary?.daily?.length ? (
                  <div className="p-8 text-center text-gray-400">
                    <TrendingUp className="h-10 w-10 mx-auto mb-2" />
                    <p>No data for this period.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:grid grid-cols-[90px_1fr_100px_100px_100px_100px] gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span>Date</span>
                      <span>Spend bar</span>
                      <span className="text-right text-blue-600">Materials</span>
                      <span className="text-right text-amber-600">Equipment</span>
                      <span className="text-right text-purple-600">Labour</span>
                      <span className="text-right font-bold text-gray-700">Total</span>
                    </div>
                    <div className="divide-y">
                      {(() => {
                        const maxDay = Math.max(...(summary.daily as any[]).map((d: any) => d.totalCost || 0), 1);
                        return (summary.daily as any[]).map((d: any) => {
                          const total = d.totalCost || 0;
                          const matPct = pct(d.materialCost, total);
                          const eqPct = pct(d.equipmentCost, total);
                          const labPct = pct(d.labourCost, total);
                          const barWidth = pct(total, maxDay);
                          return (
                            <div key={String(d.date)} className="grid grid-cols-1 lg:grid-cols-[90px_1fr_100px_100px_100px_100px] gap-2 items-center px-4 py-3">
                              <span className="text-sm font-semibold text-gray-800">
                                {new Date(d.date).getDate()}{' '}
                                <span className="font-normal text-gray-500">{new Date(d.date).toLocaleDateString('en', { month: 'short' })}</span>
                              </span>
                              {/* Stacked bar */}
                              <div className="h-5 bg-gray-100 rounded overflow-hidden flex" style={{ width: `${barWidth}%`, minWidth: total > 0 ? 16 : 0 }}>
                                {matPct > 0 && <div className="bg-blue-400 h-full" style={{ width: `${matPct}%` }} title={`Materials ${matPct}%`} />}
                                {eqPct > 0 && <div className="bg-amber-400 h-full" style={{ width: `${eqPct}%` }} title={`Equipment ${eqPct}%`} />}
                                {labPct > 0 && <div className="bg-purple-400 h-full" style={{ width: `${labPct}%` }} title={`Labour ${labPct}%`} />}
                              </div>
                              <span className="text-right text-sm text-blue-700 font-medium">{fmt(d.materialCost)}</span>
                              <span className="text-right text-sm text-amber-700 font-medium">{fmt(d.equipmentCost)}</span>
                              <span className="text-right text-sm text-purple-700 font-medium">{fmt(d.labourCost)}</span>
                              <span className="text-right text-sm font-bold text-gray-900">{total > 0 ? fmtShort(total) : '—'}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />Materials</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Equipment</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />Labour</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          Create Daily Log Dialog
      ════════════════════════════════════════════════════════ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Daily Log</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <Input type="date" value={newLog.logDate} onChange={(e) => setNewLog({ ...newLog, logDate: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Weather</label>
              <Select
                options={[{ value: '', label: 'Select' }, { value: 'CLEAR', label: '☀️ Clear' }, { value: 'CLOUDY', label: '☁️ Cloudy' }, { value: 'RAIN', label: '🌧️ Rain' }, { value: 'STORM', label: '⛈️ Storm' }, { value: 'HOT', label: '🌡️ Hot' }, { value: 'WINDY', label: '💨 Windy' }]}
                value={newLog.weather}
                onChange={(e) => setNewLog({ ...newLog, weather: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Crew Count</label>
              <Input type="number" value={newLog.crewCount} onChange={(e) => setNewLog({ ...newLog, crewCount: e.target.value })} placeholder="e.g. 15" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Work Summary</label>
              <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3}
                value={newLog.workSummary} onChange={(e) => setNewLog({ ...newLog, workSummary: e.target.value })}
                placeholder="What was done today..." />
            </div>
            <Button className="w-full" onClick={() => createLog.mutate()} disabled={createLog.isPending}>
              {createLog.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Daily Log Detail Dialog
      ════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewLogId} onOpenChange={() => setViewLogId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : logDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {formatDate(logDetail.logDate)}
                  {logDetail.weather && <Badge variant="outline">{WEATHER_EMOJI[logDetail.weather]} {logDetail.weather}</Badge>}
                  {logDetail.crewCount != null && <Badge variant="secondary">{logDetail.crewCount} workers</Badge>}
                  {detailTotal > 0 && (
                    <span className="ml-auto text-base font-bold text-green-700">{fmt(detailTotal)}</span>
                  )}
                </DialogTitle>
              </DialogHeader>
              {logDetail.workSummary && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{logDetail.workSummary}</p>
              )}

              {/* ── Trade-wise Submission Summary ── */}
              {tradeSummary && tradeSummary.length > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3">Work Submissions This Day</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tradeSummary.map((t: any) => (
                      <div key={t.trade} className={`rounded-lg px-3 py-2 text-sm ${tradeBadge(t.trade)}`}>
                        <p className="font-bold truncate">{t.trade}</p>
                        <p className="text-xs opacity-80">
                          {t.submissionCount} photo{t.submissionCount !== 1 ? 's' : ''}
                          {t.totalQty > 0 && <> · {t.totalQty} {t.unit}</>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 border-b mt-2">
                {(['materials', 'labour', 'equipment'] as const).map((tab) => {
                  const labourTotal = logDetail.labourLogs?.reduce((s: number, l: any) => s + Number(l.dailyWage || 0), 0) || 0;
                  const unpaidTotal = logDetail.labourLogs?.filter((l: any) => !l.paid).reduce((s: number, l: any) => s + Number(l.dailyWage || 0), 0) || 0;
                  return (
                    <button
                      key={tab}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'materials' && <><Package className="inline h-4 w-4 mr-1" />Materials ({logDetail.materialLogs?.length || 0})</>}
                      {tab === 'labour' && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          Labour ({logDetail.labourLogs?.length || 0})
                          {unpaidTotal > 0 && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded-full">{fmtShort(unpaidTotal)} unpaid</span>}
                        </span>
                      )}
                      {tab === 'equipment' && <><Wrench className="inline h-4 w-4 mr-1" />Equipment ({logDetail.equipmentLogs?.length || 0})</>}
                    </button>
                  );
                })}
              </div>

              {/* ── Materials tab ── */}
              {activeTab === 'materials' && (
                <div className="space-y-2">
                  {logDetail.materialLogs?.map((m: any) => {
                    const unitCost = Number(m.unitCost || 0);
                    const qty = Number(m.quantity || 0);
                    const billPhoto = m.billingPhotos?.[0]?.photoUrl || m.billingPhotos?.[0]?.thumbnailUrl;
                    return (
                      <div key={m.id} className="flex items-start justify-between p-3 rounded-lg border bg-gray-50/50 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{m.item}</p>
                            {m.trade && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tradeBadge(m.trade)}`}>
                                {m.trade}
                              </span>
                            )}
                            {billPhoto && <span title="Bill attached"><ImageIcon className="h-3.5 w-3.5 text-green-600 shrink-0" /></span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {qty} {m.unit}
                            {unitCost > 0 && ` × ₹${unitCost.toLocaleString('en-IN')} = `}
                            {m.vendor && <span className="ml-1">· {m.vendor}</span>}
                            {m.invoiceNumber && <span className="ml-1">· Invoice: {m.invoiceNumber}</span>}
                          </p>
                        </div>
                        {/* Bill photo thumbnail */}
                        {billPhoto && (
                          <button onClick={() => setPhotoView(billPhoto)} className="shrink-0">
                            <img src={billPhoto} alt="Bill" className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                          </button>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-gray-900">{fmt(m.totalCost)}</span>
                          <button onClick={() => deleteEntry('materials', m.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add form */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 border rounded-lg bg-white mt-2">
                    <Input placeholder="Item name *" value={matForm.item} onChange={(e) => setMatForm({ ...matForm, item: e.target.value })} />
                    <div className="flex gap-1">
                      <Input placeholder="Qty" type="number" value={matForm.quantity} onChange={(e) => setMatForm({ ...matForm, quantity: e.target.value })} className="w-20" />
                      <Select options={['Bags', 'Kg', 'Tons', 'Cum', 'Nos', 'Sqft', 'Rft', 'Ltrs'].map((u) => ({ value: u, label: u }))}
                        value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} className="w-24" />
                    </div>
                    <Input placeholder="Total cost (₹)" type="number" value={matForm.totalCost} onChange={(e) => setMatForm({ ...matForm, totalCost: e.target.value })} />
                    <div className="flex gap-1">
                      <Input placeholder="Vendor" value={matForm.vendor} onChange={(e) => setMatForm({ ...matForm, vendor: e.target.value })} className="flex-1" />
                      <Select
                        options={[{ value: '', label: 'Trade…' }, ...TRADES.map((t) => ({ value: t, label: t }))]}
                        value={matForm.trade}
                        onChange={(e) => setMatForm({ ...matForm, trade: e.target.value })}
                        className="w-36"
                      />
                      <Button size="sm" onClick={() => addMaterial.mutate()} disabled={!matForm.item || !matForm.quantity || addMaterial.isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Labour tab ── */}
              {activeTab === 'labour' && (
                <div className="space-y-2">
                  {/* Mark all paid button */}
                  {(logDetail.labourLogs?.length || 0) > 0 && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="text-green-700 border-green-300"
                        onClick={() => markAllPaid(viewLogId!, true)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Mark All Paid
                      </Button>
                      <Button variant="outline" size="sm" className="text-gray-500"
                        onClick={() => markAllPaid(viewLogId!, false)}>
                        <XCircle className="h-4 w-4 mr-1" />Reset
                      </Button>
                    </div>
                  )}
                  {logDetail.labourLogs?.map((l: any) => {
                    let count = 1, wagePerWorker = Number(l.dailyWage || 0);
                    try { const n = l.note && JSON.parse(l.note); if (n?.count) { count = n.count; wagePerWorker = n.wagePerWorker ?? wagePerWorker; } } catch {}
                    return (
                      <div key={l.id} className={`flex items-center justify-between p-3 rounded-lg border gap-3 ${l.paid ? 'bg-green-50 border-green-200' : 'bg-gray-50/50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{l.role || l.workerName}</p>
                            {l.trade && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tradeBadge(l.trade)}`}>
                                {l.trade}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {count > 1 ? `${count} workers × ₹${wagePerWorker.toLocaleString('en-IN')}/day` : (l.hoursWorked ? `${Number(l.hoursWorked)}h` : 'Daily wage')}
                            {l.paid && l.paidAt && <span className="ml-2 text-green-600">· Paid {new Date(l.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-gray-900">{fmt(l.dailyWage)}</span>
                          {/* Paid toggle */}
                          <button
                            onClick={() => togglePaid(l.id, !l.paid)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold transition-colors ${l.paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                            title={l.paid ? 'Click to mark as unpaid' : 'Click to mark as paid'}
                          >
                            {l.paid ? <><CheckCircle2 className="h-3 w-3" /> Paid</> : <><XCircle className="h-3 w-3" /> Unpaid</>}
                          </button>
                          <button onClick={() => deleteEntry('labour', l.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add form */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 p-3 border rounded-lg bg-white mt-2">
                    <Input placeholder="Worker name" value={labForm.workerName} onChange={(e) => setLabForm({ ...labForm, workerName: e.target.value })} />
                    <Input placeholder="Role (Mason...)" value={labForm.role} onChange={(e) => setLabForm({ ...labForm, role: e.target.value })} />
                    <Input placeholder="Hours" type="number" value={labForm.hoursWorked} onChange={(e) => setLabForm({ ...labForm, hoursWorked: e.target.value })} />
                    <Input placeholder="Daily wage (₹)" type="number" value={labForm.dailyWage} onChange={(e) => setLabForm({ ...labForm, dailyWage: e.target.value })} />
                    <Select
                      options={[{ value: '', label: 'Trade…' }, ...TRADES.map((t) => ({ value: t, label: t }))]}
                      value={labForm.trade}
                      onChange={(e) => setLabForm({ ...labForm, trade: e.target.value })}
                    />
                    <Button size="sm" onClick={() => addLabour.mutate()} disabled={!labForm.workerName || !labForm.role || addLabour.isPending}>
                      <Plus className="h-4 w-4 mr-1" />Add
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Equipment tab ── */}
              {activeTab === 'equipment' && (
                <div className="space-y-2">
                  {logDetail.equipmentLogs?.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{e.name}</p>
                        <p className="text-xs text-gray-500">
                          <Badge variant="outline" className="text-[10px] mr-1">{e.type}</Badge>
                          {e.hoursUsed ? `${Number(e.hoursUsed)}h` : ''}
                          {e.rentalCostPerHour ? ` @ ₹${Number(e.rentalCostPerHour).toLocaleString('en-IN')}/hr` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{fmt(e.totalCost)}</span>
                        <button onClick={() => deleteEntry('equipment', e.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 p-3 border rounded-lg bg-white mt-2">
                    <Input placeholder="Equipment name" value={equipForm.name} onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })} />
                    <Select options={[{ value: 'RENTED', label: 'Rented' }, { value: 'OWNED', label: 'Owned' }]}
                      value={equipForm.type} onChange={(e) => setEquipForm({ ...equipForm, type: e.target.value })} />
                    <Input placeholder="Hours used" type="number" value={equipForm.hoursUsed} onChange={(e) => setEquipForm({ ...equipForm, hoursUsed: e.target.value })} />
                    <Input placeholder="Total cost (₹)" type="number" value={equipForm.totalCost} onChange={(e) => setEquipForm({ ...equipForm, totalCost: e.target.value })} />
                    <Button size="sm" onClick={() => addEquipment.mutate()} disabled={!equipForm.name || addEquipment.isPending}>
                      <Plus className="h-4 w-4 mr-1" />Add
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Full-size bill photo viewer ── */}
      <Dialog open={!!photoView} onOpenChange={() => setPhotoView(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader><DialogTitle>Bill Copy</DialogTitle></DialogHeader>
          {photoView && <img src={photoView} alt="Bill copy" className="w-full max-h-[80vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
