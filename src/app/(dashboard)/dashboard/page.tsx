'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceShort } from '@/lib/utils';
import { LayoutDashboard, Users, MapPin, AlertTriangle, HardHat, Package, Truck, Wrench, IndianRupee, ClipboardList, BarChart2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';

// Trade colour palette — cycles through for unknown trades
const TRADE_COLORS: Record<string, string> = {
  'Concrete':           'bg-slate-500',
  'Masonry':            'bg-orange-500',
  'Woodwork':           'bg-amber-600',
  'Electrical':         'bg-yellow-500',
  'Plumbing':           'bg-blue-500',
  'Roofing':            'bg-indigo-500',
  'Drainage':           'bg-cyan-600',
  'Painting':           'bg-pink-500',
  'Steel / Structural': 'bg-gray-600',
  'General':            'bg-green-500',
};
function tradeColor(trade: string) {
  return TRADE_COLORS[trade] ?? 'bg-purple-500';
}

const WEATHER_EMOJI: Record<string, string> = {
  CLEAR: '☀️', CLOUDY: '☁️', RAIN: '🌧️', STORM: '⛈️', WINDY: '💨', HOT: '🌡️', OTHER: '🌤️',
};

function formatINR(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const isToday = selectedDate === todayStr();
  const [userRole, setUserRole] = useState('');
  useEffect(() => { setUserRole(getUser()?.role || ''); }, []);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: () => api.get('/dashboard', { params: { date: selectedDate } }).then((r) => r.data),
    refetchInterval: isToday ? 60000 : false,
  });

  const { data: billingToday } = useQuery({
    queryKey: ['billing-today', selectedDate],
    queryFn: () => api.get('/billing/today', { params: { date: selectedDate } }).then((r) => r.data),
    refetchInterval: isToday ? 120000 : false,
  });

  const { data: tradeProgress } = useQuery({
    queryKey: ['trade-progress'],
    queryFn: () => api.get('/dashboard/trade-progress').then((r) => r.data),
    refetchInterval: 120000,
  });

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );

  const stats = [
    { label: 'Submissions Today', value: data?.today?.totalSubmissions || 0, icon: LayoutDashboard, color: 'text-primary-600 bg-primary-50' },
    { label: 'Active Workers', value: data?.today?.activeWorkers || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Sites', value: `${data?.today?.activeSites || 0}/${data?.today?.totalSites || 0}`, icon: MapPin, color: 'text-purple-600 bg-purple-50' },
    { label: 'Open Issues', value: data?.today?.issuesReported || 0, icon: AlertTriangle, color: data?.today?.urgentIssues > 0 ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50' },
  ];

  const hasBillingData = billingToday?.logsCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {/* Date navigator */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            max={todayStr()}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer"
          />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => shiftDate(1)} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <button onClick={() => setSelectedDate(todayStr())} className="text-xs text-primary-600 font-semibold hover:underline ml-1">
              Today
            </button>
          )}
        </div>
      </div>

      {/* Onboarding checklist — shown to admins until dismissed */}
      {isAdmin && <OnboardingChecklist />}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Trade-wise Progress ───────────────────────────────────────────── */}
      {tradeProgress && tradeProgress.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-orange-500" />
              <CardTitle>Trade Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const maxSubs = Math.max(...tradeProgress.map((t: any) => t.totalSubmissions), 1);
                return tradeProgress.map((t: any) => (
                  <div key={t.trade}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${tradeColor(t.trade)}`} />
                        <span className="text-sm font-semibold text-gray-800">{t.trade}</span>
                        <span className="text-xs text-gray-400">
                          {t.workTypeCount} work type{t.workTypeCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        {t.submissionsWithQty > 0 && (
                          <span className="text-sm font-bold text-gray-900">
                            {t.totalQty.toLocaleString('en-IN')}{' '}
                            <span className="text-xs font-medium text-blue-600">{t.unit}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {t.totalSubmissions} submission{t.totalSubmissions !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${tradeColor(t.trade)} opacity-80`}
                        style={{ width: `${Math.round((t.totalSubmissions / maxSubs) * 100)}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Today's Construction Activity ─────────────────────────────────── */}
      {(hasBillingData || billingToday) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-orange-500" />
                <CardTitle>Today's Site Activity</CardTitle>
              </div>
              <Link href="/billing" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                Full report →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!hasBillingData ? (
              <div className="text-center py-6 text-gray-400">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No daily logs started today</p>
              </div>
            ) : (
              <>
                {/* Aggregate spend row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-orange-700 font-semibold uppercase tracking-wide mb-1">Total Spend</p>
                    <p className="text-2xl font-bold text-orange-600">{formatINR(billingToday?.totalToday || 0)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Package className="h-3 w-3 text-blue-600" />
                      <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Materials</p>
                    </div>
                    <p className="text-xl font-bold text-blue-600">{formatINR(billingToday?.totalMaterials || 0)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Truck className="h-3 w-3 text-yellow-700" />
                      <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Equipment</p>
                    </div>
                    <p className="text-xl font-bold text-yellow-600">{formatINR(billingToday?.totalEquipment || 0)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3 w-3 text-green-700" />
                      <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Labour</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatINR(billingToday?.totalLabour || 0)}</p>
                  </div>
                </div>

                {/* Per-site breakdown */}
                <div className="space-y-3">
                  {billingToday?.sites?.map((site: any) => (
                    <div key={site.siteId} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <span className="text-lg">{WEATHER_EMOJI[site.weather] || '🏗️'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{site.siteName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {site.crewCount > 0 && (
                            <span className="text-xs text-gray-500">👷 {site.crewCount} crew</span>
                          )}
                          {site.materialItems > 0 && (
                            <span className="text-xs text-gray-500">📦 {site.materialItems} mat</span>
                          )}
                          {site.labourEntries > 0 && (
                            <span className="text-xs text-gray-500">🔨 {site.labourEntries} labour</span>
                          )}
                        </div>
                        {site.workSummary && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate italic">{site.workSummary}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatINR(site.totalCost)}</p>
                        <Link
                          href={`/billing?site=${site.siteId}`}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sites summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sites Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Site</th>
                  <th className="pb-3 font-medium">Submissions</th>
                  <th className="pb-3 font-medium">Active Workers</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.sitesSummary?.map((site: any) => (
                  <tr key={site.siteId} className="border-b last:border-0">
                    <td className="py-3">
                      <Link href={`/sites/${site.siteId}`} className="font-medium text-gray-900 hover:text-primary-600">{site.siteName}</Link>
                    </td>
                    <td className="py-3">{site.submissionCount}</td>
                    <td className="py-3">{site.activeWorkerCount}</td>
                    <td className="py-3">
                      <Badge variant={site.minPhotosMet ? 'success' : 'destructive'}>
                        {site.minPhotosMet ? 'On Track' : `Need ${site.minPhotosExpected - site.submissionCount} more`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data?.recentActivity?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500 shrink-0">IMG</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.workerName}</p>
                    <p className="text-xs text-gray-500">{item.siteName} &middot; {item.workType}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatDistanceShort(item.time)}</span>
                </div>
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No submissions {isToday ? 'today' : 'on this day'}</p>
                  {isToday && (
                    <Link href="/workers" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                      Manage workers →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alerts</CardTitle>
              <Link href="/alerts" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data?.alerts?.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-orange-50 border border-orange-100">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500">{alert.siteName} &middot; {formatDistanceShort(alert.time)}</p>
                  </div>
                </div>
              ))}
              {(!data?.alerts || data.alerts.length === 0) && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">✅</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-0.5">No unread alerts right now</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
