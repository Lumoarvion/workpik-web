'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewSitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', latitude: '', longitude: '',
    gpsRadiusMetres: 200, minPhotosPerDay: 1,
    beforeAfterEnabled: false, expectedStartTime: '08:00',
    expectedEndTime: '18:00', contactName: '', contactPhone: '', notes: '',
    budget: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
      };
      await api.post('/sites', payload);
      toast.success('Site created');
      router.push('/sites');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/sites"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold text-gray-900">New Site</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Site Name *</label>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <Input type="number" step="any" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="12.9716" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <Input type="number" step="any" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="77.5946" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">GPS Radius (metres)</label>
                <Input type="number" min={50} max={500} value={form.gpsRadiusMetres} onChange={(e) => update('gpsRadiusMetres', parseInt(e.target.value))} />
                <p className="text-xs text-gray-400 mt-1">Valid range for photo capture: 50-500m</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Min Photos Per Day</label>
                <Input type="number" min={1} value={form.minPhotosPerDay} onChange={(e) => update('minPhotosPerDay', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expected Start Time</label>
                <Input type="time" value={form.expectedStartTime} onChange={(e) => update('expectedStartTime', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expected End Time</label>
                <Input type="time" value={form.expectedEndTime} onChange={(e) => update('expectedEndTime', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Contact Name</label>
                <Input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Contact Phone</label>
                <Input value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Budget (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 500000"
                  value={form.budget}
                  onChange={(e) => update('budget', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Optional total budget to track spend vs budget in billing.</p>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="beforeAfter"
                  checked={form.beforeAfterEnabled}
                  onChange={(e) => update('beforeAfterEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="beforeAfter" className="text-sm font-medium text-gray-700">Enable Before/After Photo Mode</label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Link href="/sites"><Button variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Site'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
