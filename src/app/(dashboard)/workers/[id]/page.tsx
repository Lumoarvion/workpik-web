'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Phone, MapPin, Calendar, Camera, Pencil, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getUser } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function WorkerDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<string>('');
  useEffect(() => { setUserRole(getUser()?.role || ''); }, []);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', language: 'en' });
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);

  const { data: worker, isLoading } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => api.get(`/workers/${id}`).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['worker-stats', id],
    queryFn: () => api.get(`/workers/${id}/stats`).then((r) => r.data),
  });

  const { data: submissions } = useQuery({
    queryKey: ['worker-submissions', id],
    queryFn: () => api.get(`/workers/${id}/submissions`, { params: { limit: 20 } }).then((r) => r.data),
  });

  const updateWorker = useMutation({
    mutationFn: (data: { name: string; phone: string; language: string }) =>
      api.put(`/workers/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      toast.success('Worker updated');
      setEditDialogOpen(false);
    },
    onError: () => toast.error('Failed to update worker'),
  });

  const deactivateWorker = useMutation({
    mutationFn: () => api.put(`/workers/${id}/deactivate`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker deactivated');
    },
    onError: () => toast.error('Failed to deactivate worker'),
  });

  const reactivateWorker = useMutation({
    mutationFn: () => api.put(`/workers/${id}/reactivate`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker reactivated');
    },
    onError: () => toast.error('Failed to reactivate worker'),
  });

  const revokeSessions = useMutation({
    mutationFn: () => api.post(`/workers/${id}/revoke-sessions`).then((r) => r.data),
    onSuccess: () => {
      toast.success('All sessions revoked — worker must re-login');
      setRevokeConfirmOpen(false);
    },
    onError: () => toast.error('Failed to revoke sessions'),
  });

  const openEditDialog = () => {
    if (worker) {
      setEditForm({ name: worker.name, phone: worker.phone, language: worker.language || 'en' });
      setEditDialogOpen(true);
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-gray-200 rounded-xl" />;
  if (!worker) return <p>Worker not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/workers"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1>
        <Badge variant={worker.status === 'ACTIVE' ? 'success' : 'secondary'}>{worker.status}</Badge>
        {isAdmin && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => setRevokeConfirmOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-1" />Revoke Sessions
            </Button>
            {worker.status === 'ACTIVE' ? (
              <Button variant="destructive" size="sm" onClick={() => deactivateWorker.mutate()} disabled={deactivateWorker.isPending}>
                {deactivateWorker.isPending ? 'Deactivating...' : 'Deactivate'}
              </Button>
            ) : (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => reactivateWorker.mutate()} disabled={reactivateWorker.isPending}>
                {reactivateWorker.isPending ? 'Reactivating...' : 'Reactivate'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Revoke Sessions Confirmation Dialog */}
      <Dialog open={revokeConfirmOpen} onOpenChange={setRevokeConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <ShieldAlert className="h-5 w-5" />Revoke All Sessions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
              <p className="font-medium mb-1">This will immediately log out <span className="underline">{worker.name}</span> from all devices.</p>
              <p className="text-orange-700">They will need to log back into the mobile app with their phone number and OTP to continue working.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRevokeConfirmOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => revokeSessions.mutate()}
                disabled={revokeSessions.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {revokeSessions.isPending ? 'Revoking…' : 'Revoke Sessions'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Worker name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Language</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.language}
                onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="kn">Kannada</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => updateWorker.mutate(editForm)} disabled={updateWorker.isPending}>
                {updateWorker.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">{worker.name[0]}</div>
              <div>
                <h2 className="text-lg font-semibold">{worker.name}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{worker.phone}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Member since</span><span>{formatDate(worker.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Language</span><span>{worker.language}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sites</span><span>{worker.assignedSites?.length || 0}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Submissions', value: stats?.totalSubmissions || 0, icon: Camera },
            { label: 'This Month', value: stats?.thisMonth || 0, icon: Calendar },
            { label: 'Active Days', value: stats?.activeDaysThisMonth || 0, icon: MapPin },
            { label: 'GPS Compliance', value: `${stats?.gpsComplianceRate || 100}%`, icon: MapPin },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Assigned Sites */}
      <Card>
        <CardHeader><CardTitle>Assigned Sites</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {worker.assignedSites?.map((sw: any) => (
              <Link key={sw.id} href={`/sites/${sw.site.id}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 py-1.5 px-3">
                  <MapPin className="h-3 w-3 mr-1" />{sw.site.name}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent submissions */}
      <Card>
        <CardHeader><CardTitle>Recent Submissions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {submissions?.data?.map((sub: any) => (
              <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
                <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-400 shrink-0">IMG</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{sub.workType?.name} {sub.zone ? `• ${sub.zone.name}` : ''}</p>
                  <p className="text-xs text-gray-500">{sub.site?.name} • {formatDateTime(sub.createdAt)}</p>
                </div>
                <Badge variant={sub.status === 'FLAGGED' ? 'destructive' : 'success'} className="shrink-0">{sub.status}</Badge>
              </div>
            ))}
            {(!submissions?.data || submissions.data.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No submissions yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}