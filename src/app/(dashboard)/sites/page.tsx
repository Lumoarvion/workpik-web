'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';

export default function SitesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string>('');
  useEffect(() => { setUserRole(getUser()?.role || ''); }, []);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const { data, isLoading } = useQuery({
    queryKey: ['sites', search, page],
    queryFn: () => api.get('/sites', { params: { search: search || undefined, limit: 20, page } }).then((r) => r.data),
  });

  const statusColors: Record<string, string> = { ACTIVE: 'success', PAUSED: 'warning', ARCHIVED: 'secondary' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        {isAdmin && (
          <Link href="/sites/new">
            <Button><Plus className="h-4 w-4 mr-2" />Add Site</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sites..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MapPin className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">No sites found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((site: any) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <Link href={`/sites/${site.id}`} className="font-medium text-gray-900 hover:text-primary-600 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />{site.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-xs truncate">{site.address || '—'}</TableCell>
                    <TableCell><Badge variant={statusColors[site.status] as any}>{site.status}</Badge></TableCell>
                    <TableCell>{site._count?.workers || 0}</TableCell>
                    <TableCell>{site._count?.submissions || 0}</TableCell>
                    <TableCell>
                      <Link href={`/sites/${site.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium">{(data.pagination.page - 1) * data.pagination.limit + 1}</span>–<span className="font-medium">{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}</span> of <span className="font-medium">{data.pagination.total}</span>
                </p>
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
