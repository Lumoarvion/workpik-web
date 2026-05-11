'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const severityColors: Record<string, string> = { LOW: 'secondary', MEDIUM: 'warning', HIGH: 'destructive', URGENT: 'destructive' };
const statusColors: Record<string, string> = { OPEN: 'destructive', ACKNOWLEDGED: 'warning', RESOLVED: 'success' };

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<any>({});
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['issues', filters, page],
    queryFn: () => api.get('/issues', { params: { ...filters, page, limit: 20 } }).then((r) => r.data),
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.put(`/issues/${id}/acknowledge`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); toast.success('Issue acknowledged'); setSelectedIssue(null); },
  });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => api.put(`/issues/${id}/respond`, { response }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); toast.success('Response sent'); setResponse(''); },
  });

  const resolve = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.put(`/issues/${id}/resolve`, { resolutionNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue resolved');
      setSelectedIssue(null);
      setShowResolveModal(false);
      setResolutionNote('');
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Issues</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <Select
              options={[{ value: '', label: 'All Severity' }, { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' }]}
              value={filters.severity || ''}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
              className="w-40"
            />
            <Select
              options={[{ value: '', label: 'All Status' }, { value: 'OPEN', label: 'Open' }, { value: 'ACKNOWLEDGED', label: 'Acknowledged' }, { value: 'RESOLVED', label: 'Resolved' }]}
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="w-44"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <AlertTriangle className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">Failed to load issues</p>
              <p className="text-sm">Please try again later</p>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-lg font-medium text-gray-600">
                {(filters.severity || filters.status) ? 'No issues match your filters' : 'No open issues'}
              </p>
              <p className="text-sm mt-1 text-gray-400">
                {(filters.severity || filters.status)
                  ? 'Clear filters to see all issues'
                  : 'Issues are raised when a submission is flagged in the gallery.'}
              </p>
              {!(filters.severity || filters.status) && (
                <Link href="/gallery" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors">
                  <Plus className="h-4 w-4" />Go to Gallery to flag a submission
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${issue.severity === 'URGENT' ? 'text-red-500' : 'text-orange-400'}`} />
                        {issue.category}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={severityColors[issue.severity] as any}>{issue.severity}</Badge></TableCell>
                    <TableCell className="text-gray-500">{issue.site?.name}</TableCell>
                    <TableCell className="text-gray-500">{issue.worker?.name}</TableCell>
                    <TableCell><Badge variant={statusColors[issue.status] as any}>{issue.status}</Badge></TableCell>
                    <TableCell className="text-gray-500 text-xs">{formatDateTime(issue.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIssue(issue)}>View</Button>
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
                {' '}issues
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(data.pagination.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.pagination.totalPages - 4));
                  const pageNum = start + i;
                  if (pageNum > data.pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Issue Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />Resolve Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Describe how this issue was resolved. This note will be permanently attached to the issue record.
            </p>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={4}
              placeholder="What was done to resolve this issue? (minimum 5 characters)"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowResolveModal(false); setResolutionNote(''); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={resolutionNote.trim().length < 5 || resolve.isPending}
                onClick={() => selectedIssue && resolve.mutate({ id: selectedIssue.id, note: resolutionNote.trim() })}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {resolve.isPending ? 'Resolving…' : 'Confirm Resolution'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Detail Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />{selectedIssue.category}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Severity:</span> <Badge variant={severityColors[selectedIssue.severity] as any}>{selectedIssue.severity}</Badge></div>
                  <div><span className="text-gray-500">Status:</span> <Badge variant={statusColors[selectedIssue.status] as any}>{selectedIssue.status}</Badge></div>
                  <div><span className="text-gray-500">Site:</span> {selectedIssue.site?.name}</div>
                  <div><span className="text-gray-500">Reporter:</span> {selectedIssue.worker?.name}</div>
                  <div className="col-span-2"><span className="text-gray-500">Date:</span> {formatDateTime(selectedIssue.createdAt)}</div>
                </div>
                {selectedIssue.description && <div className="rounded-lg bg-gray-50 p-3 text-sm">{selectedIssue.description}</div>}
                {selectedIssue.response && <div className="rounded-lg bg-blue-50 p-3 text-sm"><span className="font-medium text-blue-800">Response:</span> {selectedIssue.response}</div>}

                <div className="space-y-2">
                  {selectedIssue.status === 'OPEN' && (
                    <Button onClick={() => acknowledge.mutate(selectedIssue.id)} className="w-full">Acknowledge</Button>
                  )}
                  {selectedIssue.status !== 'RESOLVED' && (
                    <>
                      <div className="flex gap-2">
                        <Input placeholder="Add response..." value={response} onChange={(e) => setResponse(e.target.value)} className="flex-1" />
                        <Button variant="outline" disabled={!response} onClick={() => respond.mutate({ id: selectedIssue.id, response })}>Send</Button>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setShowResolveModal(true)}
                        className="w-full"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />Mark Resolved
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}