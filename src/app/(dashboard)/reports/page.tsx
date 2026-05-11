'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FileText, Plus, Share2, ChevronLeft, ChevronRight, BarChart2, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [generateForm, setGenerateForm] = useState({ siteId: '', reportType: 'DAILY', date: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (report: any) => {
    if (downloadingId) return;
    setDownloadingId(report.id);
    try {
      const res = await api.get(`/reports/${report.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const siteName = (report.site?.name || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = report.reportDate ? report.reportDate.split('T')[0] : 'date';
      a.href = url;
      a.download = `report_${siteName}_${report.reportType.toLowerCase()}_${dateStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: sites } = useQuery({
    queryKey: ['sites-list'],
    queryFn: () => api.get('/sites', { params: { limit: 100 } }).then((r) => r.data),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', page],
    queryFn: () => api.get('/reports', { params: { page, limit: 20 } }).then((r) => r.data),
  });

  const generate = useMutation({
    mutationFn: () => api.post('/reports/generate', generateForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generated');
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const statusColors: Record<string, string> = { PENDING: 'secondary', GENERATED: 'success', SENT: 'default', FAILED: 'destructive' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Generate Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Report</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Site</label>
                <Select
                  options={sites?.data?.map((s: any) => ({ value: s.id, label: s.name })) || []}
                  placeholder="Select site"
                  value={generateForm.siteId}
                  onChange={(e) => setGenerateForm({ ...generateForm, siteId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  options={[{ value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]}
                  value={generateForm.reportType}
                  onChange={(e) => setGenerateForm({ ...generateForm, reportType: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={generateForm.date} onChange={(e) => setGenerateForm({ ...generateForm, date: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => generate.mutate()} disabled={!generateForm.siteId || !generateForm.date || generate.isPending}>
                  {generate.isPending ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">Failed to load reports</p>
              <p className="text-sm">Please try again later</p>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <BarChart2 className="h-7 w-7 text-blue-500" />
              </div>
              <p className="text-lg font-medium text-gray-600">No reports yet</p>
              <p className="text-sm mt-1 text-gray-400">Generate your first report using the form above to get started.</p>
              <Link
                href="/gallery"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4" />View Submissions First
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((report: any) => {
                  const reportData = report.data as any;
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                          {report.site?.name}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{report.reportType}</Badge></TableCell>
                      <TableCell className="text-gray-500 text-xs">{formatDate(report.reportDate)}</TableCell>
                      <TableCell className="font-medium">{reportData?.totalSubmissions ?? '—'}</TableCell>
                      <TableCell><Badge variant={statusColors[report.deliveryStatus] as any}>{report.deliveryStatus}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Download PDF */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadingId === report.id}
                            onClick={() => handleDownloadPdf(report)}
                            title="Download PDF"
                          >
                            {downloadingId === report.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Download className="h-4 w-4" />
                            }
                            <span className="ml-1.5 hidden sm:inline">PDF</span>
                          </Button>
                          {/* Share link */}
                          {report.shareToken && (
                            <Button variant="ghost" size="icon" title="Copy share link" onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/v1/reports/share/${report.shareToken}`);
                              toast.success('Share link copied');
                            }}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                {' '}reports
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
    </div>
  );
}
