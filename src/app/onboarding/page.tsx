'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setCompany } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface IndustryTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabledModules: string[];
  workTypes: any[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get('/company/industry-templates')
      .then((res) => setTemplates(res.data))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setFetching(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selected);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.put('/company/industry', { industry: selected });
      setCompany(data);
      toast.success('Setup complete!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-white text-2xl font-bold">W</div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to WorkPik</h1>
          <p className="text-gray-500 mt-2 text-lg">What industry are you in? We'll set up your workspace accordingly.</p>
        </div>

        {/* Industry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {templates.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selected === t.id
                  ? 'ring-2 ring-primary-500 bg-primary-50/50'
                  : 'hover:border-gray-300'
              }`}
              onClick={() => setSelected(t.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{t.icon}</span>
                    <h3 className="font-semibold text-gray-900 mt-2">{t.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                  </div>
                  {selected === t.id && (
                    <CheckCircle className="h-5 w-5 text-primary-600 shrink-0" />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.workTypes.slice(0, 3).map((wt: any) => (
                    <span key={wt.name} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {wt.icon} {wt.name}
                    </span>
                  ))}
                  {t.workTypes.length > 3 && (
                    <span className="text-[10px] text-gray-400 px-1 py-0.5">+{t.workTypes.length - 3} more</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Details */}
        {selectedTemplate && (
          <div className="bg-white rounded-xl border p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">
              {selectedTemplate.icon} {selectedTemplate.name} — What you'll get
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedTemplate.enabledModules.map((mod) => (
                <div key={mod} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">You can enable/disable modules anytime in Settings.</p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selected || loading}
            onClick={handleContinue}
            className="px-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Set Up My Workspace
          </Button>
        </div>

        {/* Skip */}
        <p className="text-center mt-4">
          <button
            className="text-sm text-gray-400 hover:text-gray-600 underline"
            onClick={() => router.push('/dashboard')}
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
