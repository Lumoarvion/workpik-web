'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Plus, Trash2, Users, Image, Search, UserPlus, X, Pencil, Archive } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getUser } from '@/lib/auth';

export default function SiteDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newZone, setNewZone] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  useEffect(() => { setUserRole(getUser()?.role || ''); }, []);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  // Dialogs
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', address: '', contactName: '', contactPhone: '',
    latitude: '', longitude: '', gpsRadiusMetres: '',
    minPhotosPerDay: '', workingHoursStart: '', workingHoursEnd: '',
    beforeAfterEnabled: false, budget: '',
  });

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => api.get(`/sites/${id}`).then((r) => r.data),
  });

  const { data: siteDash } = useQuery({
    queryKey: ['site-dashboard', id],
    queryFn: () => api.get(`/dashboard/site/${id}`).then((r) => r.data),
  });

  // Fetch all workers for assignment dialog
  const { data: allWorkers } = useQuery({
    queryKey: ['all-workers'],
    queryFn: () => api.get('/workers?limit=200').then((r) => r.data.data),
    enabled: workerDialogOpen,
  });

  // Fetch all users for manager/client assignment dialogs
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users?limit=200').then((r) => r.data.data),
    enabled: managerDialogOpen || clientDialogOpen,
  });

  const invalidateSite = () => queryClient.invalidateQueries({ queryKey: ['site', id] });

  // Zone mutations
  const addZone = useMutation({
    mutationFn: (name: string) => api.post(`/sites/${id}/zones`, { name }),
    onSuccess: () => { invalidateSite(); setNewZone(''); toast.success('Zone added'); },
  });

  const deleteZone = useMutation({
    mutationFn: (zoneId: string) => api.delete(`/sites/${id}/zones/${zoneId}`),
    onSuccess: () => { invalidateSite(); toast.success('Zone deleted'); },
  });

  // Worker mutations
  const assignWorker = useMutation({
    mutationFn: (workerId: string) => api.post(`/sites/${id}/workers`, { workerId }),
    onSuccess: () => { invalidateSite(); toast.success('Worker assigned'); },
    onError: () => toast.error('Failed to assign worker'),
  });

  const removeWorker = useMutation({
    mutationFn: (workerId: string) => api.delete(`/sites/${id}/workers/${workerId}`),
    onSuccess: () => { invalidateSite(); toast.success('Worker removed'); },
    onError: () => toast.error('Failed to remove worker'),
  });

  // Manager mutations
  const assignManager = useMutation({
    mutationFn: (userId: string) => api.post(`/sites/${id}/managers`, { userId }),
    onSuccess: () => { invalidateSite(); toast.success('Manager assigned'); },
    onError: () => toast.error('Failed to assign manager'),
  });

  const removeManager = useMutation({
    mutationFn: (userId: string) => api.delete(`/sites/${id}/managers/${userId}`),
    onSuccess: () => { invalidateSite(); toast.success('Manager removed'); },
    onError: () => toast.error('Failed to remove manager'),
  });

  // Client mutations
  const assignClient = useMutation({
    mutationFn: (userId: string) => api.post(`/sites/${id}/clients`, { userId }),
    onSuccess: () => { invalidateSite(); toast.success('Client assigned'); },
    onError: () => toast.error('Failed to assign client'),
  });

  const removeClient = useMutation({
    mutationFn: (userId: string) => api.delete(`/sites/${id}/clients/${userId}`),
    onSuccess: () => { invalidateSite(); toast.success('Client removed'); },
    onError: () => toast.error('Failed to remove client'),
  });

  // Edit site mutation
  const updateSite = useMutation({
    mutationFn: (data: typeof editForm) => api.put(`/sites/${id}`, {
      ...data,
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      gpsRadiusMetres: data.gpsRadiusMetres ? parseInt(data.gpsRadiusMetres) : undefined,
      minPhotosPerDay: data.minPhotosPerDay ? parseInt(data.minPhotosPerDay) : undefined,
      budget: data.budget ? parseFloat(data.budget) : undefined,
    }),
    onSuccess: () => { invalidateSite(); setEditDialogOpen(false); toast.success('Site updated'); },
    onError: () => toast.error('Failed to update site'),
  });

  // Archive site mutation
  const archiveSite = useMutation({
    mutationFn: () => api.put(`/sites/${id}/archive`),
    onSuccess: () => { invalidateSite(); setArchiveDialogOpen(false); toast.success('Site archived'); },
    onError: () => toast.error('Failed to archive site'),
  });

  const openEditDialog = () => {
    setEditForm({
      name: site?.name || '',
      address: site?.address || '',
      contactName: site?.contactName || '',
      contactPhone: site?.contactPhone || '',
      latitude: site?.latitude?.toString() || '',
      longitude: site?.longitude?.toString() || '',
      gpsRadiusMetres: site?.gpsRadiusMetres?.toString() || '',
      minPhotosPerDay: site?.minPhotosPerDay?.toString() || '',
      workingHoursStart: site?.expectedStartTime || '',
      workingHoursEnd: site?.expectedEndTime || '',
      beforeAfterEnabled: site?.beforeAfterEnabled || false,
      budget: site?.budget?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-gray-200 rounded-xl" />;
  if (!site) return <p>Site not found</p>;

  const tabs = ['overview', 'zones', 'workers', 'managers', 'clients'];

  // Filter out already-assigned IDs
  const assignedWorkerIds = new Set((site.workers || []).map((sw: any) => sw.worker.id));
  const assignedManagerIds = new Set((site.managers || []).map((sm: any) => sm.user.id));
  const assignedClientIds = new Set((site.clients || []).map((sc: any) => sc.user.id));

  const availableWorkers = (allWorkers || [])
    .filter((w: any) => !assignedWorkerIds.has(w.id) && w.status === 'ACTIVE')
    .filter((w: any) => !searchTerm || w.name.toLowerCase().includes(searchTerm.toLowerCase()) || w.phone.includes(searchTerm));

  const availableManagers = (allUsers || [])
    .filter((u: any) => u.role === 'MANAGER' && !assignedManagerIds.has(u.id) && u.isActive)
    .filter((u: any) => !searchTerm || u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const availableClients = (allUsers || [])
    .filter((u: any) => u.role === 'CLIENT' && !assignedClientIds.has(u.id) && u.isActive)
    .filter((u: any) => !searchTerm || u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sites"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{site.address || 'No address'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="h-4 w-4 mr-1" />Edit Site
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setArchiveDialogOpen(true)}>
                <Archive className="h-4 w-4 mr-1" />Archive
              </Button>
            </>
          )}
          <Badge variant={site.status === 'ACTIVE' ? 'success' : 'secondary'}>{site.status}</Badge>
        </div>
      </div>

      {/* Edit Site Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Site</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateSite.mutate(editForm); }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Name</label>
                <Input value={editForm.contactName} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <Input value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Latitude</label>
                <Input type="number" step="any" value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Longitude</label>
                <Input type="number" step="any" value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GPS Radius (metres)</label>
              <Input type="number" value={editForm.gpsRadiusMetres} onChange={(e) => setEditForm({ ...editForm, gpsRadiusMetres: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Photos Per Day</label>
              <Input type="number" value={editForm.minPhotosPerDay} onChange={(e) => setEditForm({ ...editForm, minPhotosPerDay: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Working Hours Start</label>
                <Input type="time" value={editForm.workingHoursStart} onChange={(e) => setEditForm({ ...editForm, workingHoursStart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Working Hours End</label>
                <Input type="time" value={editForm.workingHoursEnd} onChange={(e) => setEditForm({ ...editForm, workingHoursEnd: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Site Budget (₹)</label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 500000"
                value={editForm.budget}
                onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
              />
              <p className="text-xs text-gray-400">Total budget for this site. Used to track spend vs budget in billing.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="beforeAfterEnabled"
                checked={editForm.beforeAfterEnabled}
                onChange={(e) => setEditForm({ ...editForm, beforeAfterEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="beforeAfterEnabled" className="text-sm font-medium">Before/After Enabled</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateSite.isPending}>
                {updateSite.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Archive Site</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to archive <span className="font-semibold">{site.name}</span>? This will deactivate the site and it will no longer appear in active listings.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => archiveSite.mutate()} disabled={archiveSite.isPending}>
              {archiveSite.isPending ? 'Archiving...' : 'Archive Site'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Today\'s Submissions', value: siteDash?.today?.submissions || 0 },
          { label: 'Active Workers', value: siteDash?.today?.activeWorkers || 0 },
          { label: 'Zones Covered', value: siteDash?.today?.zonesCovered || 0 },
          { label: 'Open Issues', value: siteDash?.today?.issues || 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Site Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">GPS</span><span>{site.latitude?.toFixed(4)}, {site.longitude?.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">GPS Radius</span><span>{site.gpsRadiusMetres}m</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Min Photos/Day</span><span>{site.minPhotosPerDay}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Working Hours</span><span>{site.expectedStartTime || '—'} - {site.expectedEndTime || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Before/After</span><span>{site.beforeAfterEnabled ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{site.contactName || '—'} ({site.contactPhone || '—'})</span></div>
              {site.budget != null && (
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-500 font-medium">Budget</span>
                  <span className="font-semibold text-green-700">
                    ₹{Number(site.budget).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Submissions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {siteDash?.recentSubmissions?.slice(0, 10).map((sub: any) => (
                  <div key={sub.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-sm">
                    <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center shrink-0"><Image className="h-4 w-4 text-gray-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sub.workerName}</p>
                      <p className="text-xs text-gray-500">{sub.workType}{sub.zone ? ` • ${sub.zone}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'zones' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Zones</CardTitle>
              {isAdmin && <div className="flex gap-2">
                <Input placeholder="Zone name" value={newZone} onChange={(e) => setNewZone(e.target.value)} className="w-48" />
                <Button size="sm" onClick={() => newZone && addZone.mutate(newZone)} disabled={!newZone}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {site.zones?.map((zone: any) => (
                <div key={zone.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium">{zone.name}</span>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => deleteZone.mutate(zone.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
              ))}
              {(!site.zones || site.zones.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No zones yet</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Workers Tab ===== */}
      {activeTab === 'workers' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Assigned Workers ({site.workers?.length || 0})</CardTitle>
              <Dialog open={workerDialogOpen} onOpenChange={(open) => { setWorkerDialogOpen(open); setSearchTerm(''); }}>
                {isAdmin && <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />Add Worker</Button>
                </DialogTrigger>}
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Assign Worker to Site</DialogTitle></DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {availableWorkers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No available workers found</p>
                    )}
                    {availableWorkers.map((w: any) => (
                      <button
                        key={w.id}
                        onClick={() => { assignWorker.mutate(w.id); setWorkerDialogOpen(false); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium shrink-0">
                          {w.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{w.name}</p>
                          <p className="text-xs text-gray-500">{w.phone}</p>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {site.workers?.map((sw: any) => (
                <div key={sw.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">{sw.worker.name[0]}</div>
                    <div>
                      <p className="font-medium">{sw.worker.name}</p>
                      <p className="text-xs text-gray-500">{sw.worker.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sw.worker.status === 'ACTIVE' ? 'success' : 'secondary'}>{sw.worker.status}</Badge>
                    {isAdmin && <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWorker.mutate(sw.worker.id)}
                      title="Remove worker from site"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>}
                  </div>
                </div>
              ))}
              {(!site.workers || site.workers.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No workers assigned. Click "Add Worker" to assign workers to this site.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Managers Tab ===== */}
      {activeTab === 'managers' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Assigned Managers ({site.managers?.length || 0})</CardTitle>
              <Dialog open={managerDialogOpen} onOpenChange={(open) => { setManagerDialogOpen(open); setSearchTerm(''); }}>
                {isAdmin && <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />Add Manager</Button>
                </DialogTrigger>}
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Assign Manager to Site</DialogTitle></DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {availableManagers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No available managers found</p>
                    )}
                    {availableManagers.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => { assignManager.mutate(u.id); setManagerDialogOpen(false); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium shrink-0">
                          {u.fullName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{u.fullName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {site.managers?.map((sm: any) => (
                <div key={sm.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">{sm.user.fullName[0]}</div>
                    <div>
                      <p className="font-medium">{sm.user.fullName}</p>
                      <p className="text-xs text-gray-500">{sm.user.email}</p>
                    </div>
                  </div>
                  {isAdmin && <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeManager.mutate(sm.user.id)}
                    title="Remove manager from site"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>}
                </div>
              ))}
              {(!site.managers || site.managers.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No managers assigned. Click "Add Manager" to assign managers to this site.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Clients Tab ===== */}
      {activeTab === 'clients' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Assigned Clients ({site.clients?.length || 0})</CardTitle>
              <Dialog open={clientDialogOpen} onOpenChange={(open) => { setClientDialogOpen(open); setSearchTerm(''); }}>
                {isAdmin && <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />Add Client</Button>
                </DialogTrigger>}
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Assign Client to Site</DialogTitle></DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {availableClients.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No available clients found</p>
                    )}
                    {availableClients.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => { assignClient.mutate(u.id); setClientDialogOpen(false); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium shrink-0">
                          {u.fullName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{u.fullName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {site.clients?.map((sc: any) => (
                <div key={sc.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium">{sc.user.fullName[0]}</div>
                    <div>
                      <p className="font-medium">{sc.user.fullName}</p>
                      <p className="text-xs text-gray-500">{sc.user.email}</p>
                    </div>
                  </div>
                  {isAdmin && <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeClient.mutate(sc.user.id)}
                    title="Remove client from site"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>}
                </div>
              ))}
              {(!site.clients || site.clients.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No clients assigned. Click "Add Client" to assign clients to this site.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
