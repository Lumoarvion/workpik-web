'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Search, ChevronLeft, ChevronRight, Users, Upload, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getUser } from '@/lib/auth';

/** Parse a CSV text into [{name, phone}] rows, skipping header */
function parseCsvWorkers(text: string): { name: string; phone: string }[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  // Detect if first line is a header
  const firstLower = lines[0].toLowerCase();
  const startIdx = firstLower.includes('name') || firstLower.includes('phone') ? 1 : 0;
  return lines.slice(startIdx).map((line) => {
    const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    return { name: parts[0] || '', phone: parts[1] || '' };
  }).filter((r) => r.name && r.phone);
}

export default function WorkersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [newWorker, setNewWorker] = useState({ name: '', phone: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ name: string; phone: string }[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userRole, setUserRole] = useState<string>('');
  useEffect(() => { setUserRole(getUser()?.role || ''); }, []);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workers', search, page],
    queryFn: () => api.get('/workers', { params: { search: search || undefined, limit: 20, page } }).then((r) => r.data),
  });

  const handleAddWorker = async () => {
    try {
      await api.post('/workers', newWorker);
      toast.success('Worker added');
      setNewWorker({ name: '', phone: '' });
      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add worker');
    }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsvWorkers(text);
      setCsvPreview(rows);
      setCsvResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    if (csvPreview.length === 0) return;
    setCsvImporting(true);
    try {
      const res = await api.post('/workers/bulk', { workers: csvPreview });
      setCsvResult(res.data);
      if (res.data.created > 0) {
        toast.success(`${res.data.created} worker${res.data.created > 1 ? 's' : ''} imported`);
        refetch();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setCsvImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'name,phone\nJohn Doe,9876543210\nJane Smith,9123456789';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'workers_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Bulk CSV import */}
            <Button variant="outline" onClick={() => { setCsvPreview([]); setCsvResult(null); setCsvDialogOpen(true); }}>
              <Upload className="h-4 w-4 mr-2" />Import CSV
            </Button>
            {/* Single add */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Worker</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={newWorker.name} onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })} placeholder="Worker name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={newWorker.phone} onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })} placeholder="9876543210" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAddWorker} disabled={!newWorker.name || !newWorker.phone}>Add Worker</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={(open) => { setCsvDialogOpen(open); if (!open) { setCsvPreview([]); setCsvResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-600" />Bulk Import Workers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template download */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
              <p className="text-blue-800 font-medium mb-1">CSV format: two columns — <code className="bg-blue-100 px-1 rounded">name</code> and <code className="bg-blue-100 px-1 rounded">phone</code></p>
              <p className="text-blue-700">One worker per row. Header row optional.</p>
              <button className="mt-2 flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-xs" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" />Download template CSV
              </button>
            </div>

            {/* File picker */}
            {!csvResult && (
              <div>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
                <button
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 py-8 transition-colors cursor-pointer text-gray-500 hover:text-primary-600"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Click to select a CSV file</span>
                  <span className="text-xs text-gray-400">or drag and drop</span>
                </button>
              </div>
            )}

            {/* Preview table */}
            {csvPreview.length > 0 && !csvResult && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{csvPreview.length} workers found — preview:</p>
                <div className="rounded-lg border overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvPreview.slice(0, 50).map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-900">{row.name}</td>
                          <td className="px-3 py-1.5 text-gray-600">{row.phone}</td>
                        </tr>
                      ))}
                      {csvPreview.length > 50 && (
                        <tr><td colSpan={3} className="px-3 py-2 text-center text-gray-400 text-xs">… and {csvPreview.length - 50} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setCsvPreview([]); fileInputRef.current?.click(); }}>
                    Change File
                  </Button>
                  <Button className="flex-1" disabled={csvImporting} onClick={handleCsvImport}>
                    {csvImporting ? 'Importing…' : `Import ${csvPreview.length} workers`}
                  </Button>
                </div>
              </div>
            )}

            {/* Result */}
            {csvResult && (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{csvResult.created}</p>
                    <p className="text-xs text-green-600">Imported</p>
                  </div>
                  {csvResult.failed > 0 && (
                    <div className="flex-1 rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                      <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-red-700">{csvResult.failed}</p>
                      <p className="text-xs text-red-600">Skipped</p>
                    </div>
                  )}
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-medium text-red-700 mb-2">Skipped rows:</p>
                    <ul className="space-y-0.5">
                      {csvResult.errors.map((e, i) => (
                        <li key={i} className="text-xs text-red-600 font-mono">{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button className="w-full" onClick={() => setCsvDialogOpen(false)}>Done</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search workers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                <Users className="h-7 w-7 text-primary-500" />
              </div>
              <p className="text-lg font-medium text-gray-600">
                {search ? 'No workers match your search' : 'No workers yet'}
              </p>
              <p className="text-sm mt-1 text-gray-400">
                {search ? 'Try a different name or phone number.' : 'Add your first worker to start tracking proof-of-work submissions.'}
              </p>
              {!search && isAdmin && (
                <div className="flex gap-2 mt-4">
                  <button
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />Add worker
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
                    onClick={() => setCsvDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4" />Import CSV
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((worker: any) => (
                  <TableRow key={worker.id}>
                    <TableCell>
                      <Link href={`/workers/${worker.id}`} className="flex items-center gap-3 hover:text-primary-600">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">{worker.name[0]}</div>
                        <span className="font-medium">{worker.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-500">{worker.phone}</TableCell>
                    <TableCell><Badge variant={worker.status === 'ACTIVE' ? 'success' : 'secondary'}>{worker.status}</Badge></TableCell>
                    <TableCell>{worker.assignedSites?.map((s: any) => s.site.name).join(', ') || '—'}</TableCell>
                    <TableCell>{worker._count?.submissions || 0}</TableCell>
                    <TableCell>
                      <Link href={`/workers/${worker.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">Showing <span className="font-medium">{(data.pagination.page - 1) * data.pagination.limit + 1}</span>–<span className="font-medium">{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}</span> of <span className="font-medium">{data.pagination.total}</span></p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
