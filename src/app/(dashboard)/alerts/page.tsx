'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Bell, AlertTriangle, MapPin, Users, Camera, CheckCheck, Eye, ExternalLink,
  Clock, CheckCircle, Flag, Loader2, X, ZoomIn, ShieldCheck
} from 'lucide-react';
import { formatDistanceShort, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useState } from 'react';

const alertIcons: Record<string, any> = {
  worker_inactive: Users,
  gps_mismatch: MapPin,
  min_photos_not_met: Camera,
  urgent_issue: AlertTriangle,
};

const alertColors: Record<string, string> = {
  worker_inactive: 'bg-blue-50 border-blue-200',
  gps_mismatch: 'bg-orange-50 border-orange-200',
  min_photos_not_met: 'bg-yellow-50 border-yellow-200',
  urgent_issue: 'bg-red-50 border-red-200',
};

export default function AlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showGpsOverrideModal, setShowGpsOverrideModal] = useState(false);
  const [gpsOverrideNote, setGpsOverrideNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts', { params: { limit: 50 } }).then((r) => r.data),
  });

  // Fetch submission detail when a gps_mismatch alert is selected
  const submissionId = selectedAlert?.alertType === 'gps_mismatch' ? (selectedAlert.metadata as any)?.submissionId : null;
  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ['submission-detail', submissionId],
    queryFn: () => api.get(`/submissions/${submissionId}`).then((r) => r.data),
    enabled: !!submissionId,
  });

  // Fetch issue detail when an urgent_issue alert is selected
  const issueId = selectedAlert?.alertType === 'urgent_issue' ? (selectedAlert.metadata as any)?.issueId : null;
  const { data: issue, isLoading: issueLoading } = useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: () => api.get(`/issues/${issueId}`).then((r) => r.data),
    enabled: !!issueId,
  });

  const gpsOverride = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.put(`/alerts/${id}/gps-override`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('GPS override recorded — submission marked as OK');
      setShowGpsOverrideModal(false);
      setGpsOverrideNote('');
      setSelectedAlert(null);
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/alerts/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put('/alerts/read-all'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); toast.success('All marked as read'); },
  });

  const handleAlertClick = (alert: any) => {
    // Mark as read if unread
    if (!alert.isRead) {
      markRead.mutate(alert.id);
    }
    setSelectedAlert(alert);
  };

  const handleGoToPage = (alert: any) => {
    setSelectedAlert(null);
    if (alert.alertType === 'gps_mismatch') {
      router.push('/gallery');
    } else if (alert.alertType === 'urgent_issue') {
      router.push('/issues');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <Badge variant="success">Submitted</Badge>;
      case 'FLAGGED': return <Badge variant="destructive">Flagged</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const severityColors: Record<string, string> = { LOW: 'secondary', MEDIUM: 'warning', HIGH: 'destructive', URGENT: 'destructive' };
  const statusColors: Record<string, string> = { OPEN: 'destructive', ACKNOWLEDGED: 'warning', RESOLVED: 'success' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
          <CheckCheck className="h-4 w-4 mr-2" />Mark All Read
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {data?.data?.map((alert: any) => {
                const Icon = alertIcons[alert.alertType] || Bell;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-sm ${
                      alert.isRead ? 'bg-white border-gray-100 hover:bg-gray-50' : alertColors[alert.alertType] || 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className={`rounded-full p-2 ${alert.isRead ? 'bg-gray-100' : 'bg-white'}`}>
                      <Icon className={`h-5 w-5 ${alert.isRead ? 'text-gray-400' : 'text-orange-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${alert.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{alert.site?.name} &middot; {formatDistanceShort(alert.createdAt)}</p>
                      {alert.description && <p className="text-xs text-gray-500 mt-1">{alert.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
              {(!data?.data || data.data.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <CheckCircle className="h-7 w-7 text-green-500" />
                  </div>
                  <p className="text-lg font-medium text-gray-600">All caught up!</p>
                  <p className="text-sm mt-1 text-gray-400">No alerts at the moment. We'll notify you when something needs attention.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog - GPS Mismatch (shows submission) */}
      <Dialog open={selectedAlert?.alertType === 'gps_mismatch'} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              GPS Mismatch Alert
            </DialogTitle>
          </DialogHeader>

          {/* Alert info */}
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm">
            <p className="font-medium text-orange-900">{selectedAlert?.title}</p>
            <p className="text-orange-700 mt-0.5">{selectedAlert?.description}</p>
            <p className="text-orange-500 text-xs mt-1">{selectedAlert?.site?.name} &middot; {selectedAlert && formatDistanceShort(selectedAlert.createdAt)}</p>
          </div>

          {/* Submission detail */}
          {submissionLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : submission ? (
            <div className="space-y-4">
              {/* Photos */}
              {submission.photos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Photos</p>
                  <div className={`grid gap-2 ${submission.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {submission.photos.map((photo: any, idx: number) => (
                      <div key={photo.id || idx} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border">
                        {(photo.thumbnailUrl || photo.photoUrl) ? (
                          <img src={photo.thumbnailUrl || photo.photoUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <Camera className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm rounded-lg border p-4 bg-gray-50/50">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Worker</p>
                  <p className="font-medium text-gray-900">{submission.worker?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Site</p>
                  <p className="font-medium text-gray-900">{submission.site?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Work Type</p>
                  <p className="font-medium text-gray-900">
                    {submission.workType?.icon && <span className="mr-1">{submission.workType.icon}</span>}
                    {submission.workType?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Date & Time</p>
                  <p className="font-medium text-gray-900">{formatDateTime(submission.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">GPS Coordinates</p>
                  <p className="font-medium text-gray-900">{submission.latitude?.toFixed(5)}, {submission.longitude?.toFixed(5)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Distance from Site</p>
                  <p className="font-medium text-red-600">{Math.round(submission.distanceFromSite || (selectedAlert?.metadata as any)?.distance || 0)}m away</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-gray-600">Submission Status</span>
                {getStatusBadge(submission.status)}
              </div>
            </div>
          ) : !submissionId ? (
            <div className="text-center py-6 text-gray-400">
              <Camera className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Submission details not available for this alert</p>
            </div>
          ) : null}

          {/* Existing override info */}
          {(selectedAlert?.metadata as any)?.gpsOverride && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">GPS Override Applied</span>
              </div>
              <p className="text-green-700">{(selectedAlert.metadata as any).gpsOverride.note}</p>
              <p className="text-green-500 text-xs mt-1">
                By {(selectedAlert.metadata as any).gpsOverride.overriddenByName} &middot;{' '}
                {formatDateTime((selectedAlert.metadata as any).gpsOverride.overriddenAt)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleGoToPage(selectedAlert)}>
              <ExternalLink className="h-4 w-4 mr-1.5" />View in Submissions
            </Button>
            {!(selectedAlert?.metadata as any)?.gpsOverride && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowGpsOverrideModal(true)}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />Override — Mark as OK
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GPS Override Confirmation Modal */}
      <Dialog open={showGpsOverrideModal} onOpenChange={setShowGpsOverrideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />Override GPS Mismatch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Provide a reason for overriding this GPS mismatch. This creates an audit trail confirming you reviewed the submission.
            </p>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={4}
              placeholder="e.g. Worker confirmed on-site via call. GPS drift due to poor signal at basement level. (min. 20 characters)"
              value={gpsOverrideNote}
              onChange={(e) => setGpsOverrideNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowGpsOverrideModal(false); setGpsOverrideNote(''); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={gpsOverrideNote.trim().length < 20 || gpsOverride.isPending}
                onClick={() => selectedAlert && gpsOverride.mutate({ id: selectedAlert.id, note: gpsOverrideNote.trim() })}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {gpsOverride.isPending ? 'Saving…' : 'Confirm Override'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Detail Dialog - Urgent Issue */}
      <Dialog open={selectedAlert?.alertType === 'urgent_issue'} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Urgent Issue
            </DialogTitle>
          </DialogHeader>

          {/* Alert info */}
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
            <p className="font-medium text-red-900">{selectedAlert?.title}</p>
            {selectedAlert?.description && <p className="text-red-700 mt-0.5">{selectedAlert.description}</p>}
            <p className="text-red-500 text-xs mt-1">{selectedAlert?.site?.name} &middot; {selectedAlert && formatDistanceShort(selectedAlert.createdAt)}</p>
          </div>

          {/* Issue detail */}
          {issueLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : issue ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm rounded-lg border p-4 bg-gray-50/50">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Category</p>
                  <p className="font-medium text-gray-900">{issue.category}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Severity</p>
                  <Badge variant={severityColors[issue.severity] as any}>{issue.severity}</Badge>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Status</p>
                  <Badge variant={statusColors[issue.status] as any}>{issue.status}</Badge>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Reporter</p>
                  <p className="font-medium text-gray-900">{issue.worker?.name || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-0.5">Date</p>
                  <p className="font-medium text-gray-900">{formatDateTime(issue.createdAt)}</p>
                </div>
              </div>

              {issue.description && (
                <div className="rounded-lg bg-gray-50 border p-3 text-sm">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Description</p>
                  <p className="text-gray-700">{issue.description}</p>
                </div>
              )}

              {issue.response && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Response</p>
                  <p className="text-blue-800">{issue.response}</p>
                </div>
              )}

              {issue.photoUrl && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Photo</p>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border max-w-sm">
                    <img src={issue.photoUrl} alt="Issue photo" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          ) : !issueId ? (
            <div className="text-center py-6 text-gray-400">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Issue details not available for this alert</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => handleGoToPage(selectedAlert)}>
              <ExternalLink className="h-4 w-4 mr-1.5" />View in Issues
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generic Alert Detail (for other alert types) */}
      <Dialog open={!!selectedAlert && selectedAlert.alertType !== 'gps_mismatch' && selectedAlert.alertType !== 'urgent_issue'} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              Alert Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 border p-3 text-sm">
              <p className="font-medium text-gray-900">{selectedAlert?.title}</p>
              {selectedAlert?.description && <p className="text-gray-600 mt-1">{selectedAlert.description}</p>}
              <p className="text-gray-400 text-xs mt-2">{selectedAlert?.site?.name} &middot; {selectedAlert && formatDistanceShort(selectedAlert.createdAt)}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
