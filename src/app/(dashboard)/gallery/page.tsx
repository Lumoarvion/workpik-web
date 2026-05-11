'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Camera, MapPin, Flag, Clock, CheckCircle, AlertTriangle, XCircle,
  ChevronLeft, ChevronRight, Eye, Search, FileWarning, Loader2, X, ZoomIn, ZoomOut,
  Share2, Copy, Link2, Maximize2
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { formatDateTime, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SubmissionsPage() {
  const [filters, setFilters] = useState<any>({ page: 1, limit: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const lightboxDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const { data: sites } = useQuery({
    queryKey: ['sites-list'],
    queryFn: () => api.get('/sites', { params: { limit: 100 } }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['submissions-stats', filters.siteId, filters.dateFrom, filters.dateTo],
    queryFn: () => api.get('/submissions/stats', {
      params: {
        siteId: filters.siteId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
    }).then((r) => r.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['submissions', filters],
    queryFn: () => api.get('/submissions', { params: filters }).then((r) => r.data),
  });

  // Fetch full submission detail (with signed photo URLs) when selected
  const { data: selectedSubmission, isLoading: detailLoading } = useQuery({
    queryKey: ['submission-detail', selectedId],
    queryFn: () => api.get(`/submissions/${selectedId}`).then((r) => r.data),
    enabled: !!selectedId,
  });

  const handleFlag = async (id: string) => {
    try {
      await api.put(`/submissions/${id}/flag`, { reason: flagReason });
      toast.success('Submission flagged');
      setShowFlagDialog(false);
      setFlagReason('');
      setSelectedId(null);
      refetch();
    } catch { toast.error('Failed to flag'); }
  };

  const handleShare = async (id: string) => {
    setShareLoading(true);
    try {
      const res = await api.post(`/submissions/${id}/share`);
      const shareUrl = `${window.location.origin}/share/submissions/${res.data.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch { toast.error('Failed to create share link'); }
    finally { setShareLoading(false); }
  };

  const handleUnflag = async (id: string) => {
    try {
      await api.put(`/submissions/${id}/unflag`);
      toast.success('Flag removed');
      setSelectedId(null);
      refetch();
    } catch { toast.error('Failed to unflag'); }
  };

  const statusCounts = stats?.byStatus?.reduce((acc: any, s: any) => {
    acc[s.status] = s._count;
    return acc;
  }, {} as Record<string, number>) || {};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <Badge variant="success">Submitted</Badge>;
      case 'FLAGGED': return <Badge variant="destructive">Flagged</Badge>;
      case 'RETAKE_REQUESTED': return <Badge variant="warning">Retake</Badge>;
      case 'PENDING_SYNC': return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGpsBadge = (isWithinRadius: boolean) => {
    return isWithinRadius
      ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
      : <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />Outside</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage worker proof-of-work submissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold">{stats?.totalSubmissions ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="text-xl font-bold">{statusCounts['SUBMITTED'] ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Flagged</p>
                <p className="text-xl font-bold">{statusCounts['FLAGGED'] ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">GPS Compliance</p>
                <p className="text-xl font-bold">{stats?.gpsComplianceRate ?? '—'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
              <Search className="h-4 w-4 text-gray-400" />
              <Select
                options={[{ value: '', label: 'All Sites' }, ...(sites?.data?.map((s: any) => ({ value: s.id, label: s.name })) || [])]}
                value={filters.siteId || ''}
                onChange={(e) => setFilters({ ...filters, siteId: e.target.value || undefined, page: 1 })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From</span>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined, page: 1 })}
                className="w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">To</span>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined, page: 1 })}
                className="w-36"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'FLAGGED', label: 'Flagged' },
                { value: 'RETAKE_REQUESTED', label: 'Retake Requested' },
                { value: 'PENDING_SYNC', label: 'Pending Sync' },
              ]}
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
              className="w-40"
            />
            {(filters.siteId || filters.dateFrom || filters.dateTo || filters.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ page: 1, limit: 20 })}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Camera className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">
                {(filters.siteId || filters.workTypeId || filters.dateFrom) ? 'No submissions match your filters' : 'No submissions yet'}
              </p>
              <p className="text-sm mt-1">
                {(filters.siteId || filters.workTypeId || filters.dateFrom)
                  ? 'Try clearing some filters to see more results'
                  : 'Workers submit photo proof from the mobile app. Share the app with your team to get started.'}
              </p>
              {!(filters.siteId || filters.workTypeId || filters.dateFrom) && (
                <div className="flex gap-3 mt-4">
                  <a href="/workers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors">
                    👷 Manage Workers
                  </a>
                  <a href="/sites" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
                    📍 View Sites
                  </a>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Work Type</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((sub: any) => (
                  <TableRow key={sub.id} className="cursor-pointer" onClick={() => setSelectedId(sub.id)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-medium shrink-0">
                          {sub.worker?.name?.[0] || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{sub.worker?.name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{sub.site?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {sub.workType?.icon && <span>{sub.workType.icon}</span>}
                          <span className="text-gray-700">{sub.workType?.name || '—'}</span>
                          {sub.workType?.trade && (
                            <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                              {sub.workType.trade}
                            </span>
                          )}
                        </div>
                        {(sub.customData as any)?.quantity && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              {(sub.customData as any).quantity} {(sub.customData as any).unit || sub.workType?.billingUnit || ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{sub.zone?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm">{formatDateTime(sub.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Camera className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">{sub.photos?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getGpsBadge(sub.isWithinRadius)}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(sub.id); }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-medium text-gray-900">
                  {(data.pagination.page - 1) * data.pagination.limit + 1}
                </span>
                –
                <span className="font-medium text-gray-900">
                  {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}
                </span>
                {' '}of{' '}
                <span className="font-medium text-gray-900">{data.pagination.total}</span>
                {' '}submissions
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(data.pagination.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(filters.page - 2, data.pagination.totalPages - 4));
                  const pageNum = start + i;
                  if (pageNum > data.pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === filters.page ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setFilters({ ...filters, page: pageNum })}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= data.pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Detail Dialog */}
      <Dialog open={!!selectedId && !showFlagDialog} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : selectedSubmission ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Submission Details
                  {getStatusBadge(selectedSubmission.status)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Photo Steps Timeline or Photo Grid */}
                {selectedSubmission.photos?.length > 0 ? (
                  selectedSubmission.workType?.photoSteps?.length > 0 && selectedSubmission.photos.some((p: any) => p.photoStepId) ? (
                    // Timeline view for photo steps
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                        Photo Steps Timeline ({selectedSubmission.photos.length} photos)
                      </p>
                      <div className="relative pl-6 space-y-4">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                        {(selectedSubmission.workType.photoSteps as any[])
                          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                          .map((step: any, stepIdx: number) => {
                            const photo = selectedSubmission.photos.find((p: any) => p.photoStepId === step.id);
                            return (
                              <div key={step.id} className="relative">
                                {/* Timeline dot */}
                                <div className={`absolute -left-6 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
                                  photo ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                                }`}>
                                  {photo ? (
                                    <CheckCircle className="h-3 w-3 text-white" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-gray-400">{stepIdx + 1}</span>
                                  )}
                                </div>
                                <div className="rounded-lg border bg-white overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                                    <div>
                                      <span className="text-sm font-medium text-gray-900">{step.label}</span>
                                      {step.description && (
                                        <span className="text-xs text-gray-500 ml-2">{step.description}</span>
                                      )}
                                    </div>
                                    {!step.required && <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                                  </div>
                                  {photo ? (
                                    <div className="flex gap-3 p-3">
                                      <div
                                        className="w-32 h-24 rounded-md overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all shrink-0 group relative"
                                        onClick={() => setLightboxPhoto(photo.photoUrl || photo.thumbnailUrl)}
                                      >
                                        <img
                                          src={photo.thumbnailUrl || photo.photoUrl}
                                          alt={step.label}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                          <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </div>
                                      <div className="space-y-1 text-xs text-gray-500 min-w-0">
                                        {photo.capturedAt && (
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatDateTime(photo.capturedAt)}</span>
                                          </div>
                                        )}
                                        {(photo.latitude || photo.longitude) && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            <span>{photo.latitude?.toFixed(5)}, {photo.longitude?.toFixed(5)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 text-center text-gray-400 text-xs">
                                      <Camera className="h-5 w-5 mx-auto mb-1" />
                                      Skipped
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    // Standard grid view
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                        Photos ({selectedSubmission.photos.length})
                      </p>
                      <div className={`grid gap-2 ${
                        selectedSubmission.photos.length === 1 ? 'grid-cols-1' :
                        selectedSubmission.photos.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2 lg:grid-cols-3'
                      }`}>
                        {selectedSubmission.photos.map((photo: any, idx: number) => (
                          <div
                            key={photo.id || idx}
                            className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                            onClick={() => setLightboxPhoto(photo.photoUrl || photo.thumbnailUrl)}
                          >
                            {(photo.thumbnailUrl || photo.photoUrl) ? (
                              <img
                                src={photo.thumbnailUrl || photo.photoUrl}
                                alt={`Photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex flex-col items-center justify-center text-gray-400 ${(photo.thumbnailUrl || photo.photoUrl) ? 'hidden' : ''}`}>
                              <Camera className="h-8 w-8 mb-1" />
                              <span className="text-xs">Photo {idx + 1}</span>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                            <div className="absolute bottom-1.5 right-1.5">
                              <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                {idx + 1}/{selectedSubmission.photos.length}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                    <Camera className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No photos attached</p>
                  </div>
                )}

                {/* Info Grid */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Details</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm rounded-lg border p-4 bg-gray-50/50">
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Worker</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.worker?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Site</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.site?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Work Type</p>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.workType?.icon && <span className="mr-1">{selectedSubmission.workType.icon}</span>}
                        {selectedSubmission.workType?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Zone</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.zone?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Date & Time</p>
                      <p className="font-medium text-gray-900">{formatDateTime(selectedSubmission.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Photos</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.photos?.length || 0} photo(s)</p>
                    </div>
                  </div>
                </div>

                {/* GPS Info */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {selectedSubmission.latitude?.toFixed(5)}, {selectedSubmission.longitude?.toFixed(5)}
                      </span>
                    </div>
                    {getGpsBadge(selectedSubmission.isWithinRadius)}
                  </div>
                </div>

                {/* Note */}
                {selectedSubmission.note && (
                  <div className="rounded-lg bg-gray-50 border p-3 text-sm">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Worker Note</p>
                    <p className="text-gray-700">{selectedSubmission.note}</p>
                  </div>
                )}

                {/* Quantity highlight — shown prominently if present */}
                {(selectedSubmission.customData as any)?.quantity && (
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-5 py-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Quantity Logged</p>
                      <p className="text-2xl font-black text-green-800">
                        {(selectedSubmission.customData as any).quantity.toLocaleString('en-IN')}
                        <span className="text-base font-semibold text-green-600 ml-1.5">
                          {(selectedSubmission.customData as any).unit || selectedSubmission.workType?.billingUnit || ''}
                        </span>
                      </p>
                    </div>
                    {selectedSubmission.workType?.trade && (
                      <span className="text-sm font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                        {selectedSubmission.workType.trade}
                      </span>
                    )}
                  </div>
                )}

                {/* Custom Data */}
                {selectedSubmission.customData && Object.keys(selectedSubmission.customData).length > 0 &&
                  // Only show if there are fields BEYOND quantity/unit
                  Object.keys(selectedSubmission.customData).some(k => k !== 'quantity' && k !== 'unit') && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Custom Fields</p>
                    <div className="rounded-lg border p-4 bg-gray-50/50 space-y-2">
                      {selectedSubmission.workType?.customFields ? (
                        (selectedSubmission.workType.customFields as any[]).map((field: any) => {
                          const val = selectedSubmission.customData[field.id];
                          if (val === undefined || val === '' || val === false || (Array.isArray(val) && val.length === 0)) return null;
                          let displayVal = '';
                          if (typeof val === 'boolean') displayVal = val ? 'Yes' : 'No';
                          else if (Array.isArray(val)) displayVal = val.join(', ');
                          else displayVal = String(val);
                          return (
                            <div key={field.id} className="flex justify-between text-sm">
                              <span className="text-gray-500">{field.label}</span>
                              <span className="font-medium text-gray-900">{displayVal}</span>
                            </div>
                          );
                        })
                      ) : (
                        Object.entries(selectedSubmission.customData).map(([key, val]: [string, any]) => {
                          let displayVal = '';
                          if (typeof val === 'boolean') displayVal = val ? 'Yes' : 'No';
                          else if (Array.isArray(val)) displayVal = val.join(', ');
                          else displayVal = String(val || '');
                          if (!displayVal) return null;
                          return (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-500">{key}</span>
                              <span className="font-medium text-gray-900">{displayVal}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Flag Reason + Audit Trail */}
                {selectedSubmission.flagReason && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Flagged</p>
                      {selectedSubmission.flaggedByName && (
                        <span className="text-xs text-red-500">
                          by <span className="font-semibold">{selectedSubmission.flaggedByName}</span>
                          {' '}· {formatDateTime(selectedSubmission.updatedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-red-700">{selectedSubmission.flagReason}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={shareLoading}
                    onClick={() => handleShare(selectedSubmission.id)}
                  >
                    {shareLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Share2 className="h-4 w-4 mr-1.5" />}
                    Share
                  </Button>
                  {selectedSubmission.status !== 'FLAGGED' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowFlagDialog(true)}
                    >
                      <Flag className="h-4 w-4 mr-1.5" />Flag
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnflag(selectedSubmission.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />Remove Flag
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Full-Screen Photo Lightbox with zoom */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-hidden"
          onClick={() => { setLightboxPhoto(null); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); }}
          onWheel={(e) => {
            e.preventDefault();
            setLightboxZoom((z) => Math.min(5, Math.max(1, z - e.deltaY * 0.001)));
            if (lightboxZoom <= 1) setLightboxOffset({ x: 0, y: 0 });
          }}
        >
          {/* Top controls */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 z-10">
            <button
              className="text-white/70 hover:text-white p-1 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.max(1, z - 0.5)); if (lightboxZoom <= 1.5) setLightboxOffset({ x: 0, y: 0 }); }}
              title="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-white/80 text-sm font-mono w-12 text-center">{Math.round(lightboxZoom * 100)}%</span>
            <button
              className="text-white/70 hover:text-white p-1 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.min(5, z + 0.5)); }}
              title="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              className="text-white/70 hover:text-white p-1 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); }}
              title="Reset zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10 bg-black/40 rounded-full p-1.5"
            onClick={() => { setLightboxPhoto(null); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); }}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Hint */}
          {lightboxZoom === 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
              Scroll to zoom · Use buttons above
            </p>
          )}

          {/* Image */}
          <img
            src={lightboxPhoto}
            alt="Full size photo"
            draggable={false}
            className="max-w-full max-h-full object-contain shadow-2xl select-none"
            style={{
              transform: `scale(${lightboxZoom}) translate(${lightboxOffset.x / lightboxZoom}px, ${lightboxOffset.y / lightboxZoom}px)`,
              transition: lightboxDragRef.current ? 'none' : 'transform 0.15s ease',
              cursor: lightboxZoom > 1 ? 'grab' : 'default',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              if (lightboxZoom <= 1) return;
              e.preventDefault();
              lightboxDragRef.current = { startX: e.clientX, startY: e.clientY, ox: lightboxOffset.x, oy: lightboxOffset.y };
            }}
            onMouseMove={(e) => {
              if (!lightboxDragRef.current) return;
              const dx = e.clientX - lightboxDragRef.current.startX;
              const dy = e.clientY - lightboxDragRef.current.startY;
              setLightboxOffset({ x: lightboxDragRef.current.ox + dx, y: lightboxDragRef.current.oy + dy });
            }}
            onMouseUp={() => { lightboxDragRef.current = null; }}
            onMouseLeave={() => { lightboxDragRef.current = null; }}
          />
        </div>
      )}

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Flag Submission</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Reason for flagging</label>
              <Input
                className="mt-1.5"
                placeholder="e.g. Photo is blurry, wrong location, duplicate..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFlagDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={!flagReason}
                onClick={() => selectedSubmission && handleFlag(selectedSubmission.id)}
              >
                <Flag className="h-4 w-4 mr-1.5" />Flag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
