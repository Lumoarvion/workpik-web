'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import { setTokens, setUser, setCompany } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: '', fullName: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setCompany(data.company);
      toast.success('Account created!');
      router.push('/onboarding');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white text-xl font-bold">P</div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Company Name</label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone (optional)</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            Already have an account? <Link href="/login" className="text-primary-600 hover:underline">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
