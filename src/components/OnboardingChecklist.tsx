'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'prooftrail_onboarding_dismissed';

type CheckItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export function OnboardingChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  const { data: workers } = useQuery({
    queryKey: ['onboarding-workers'],
    queryFn: () => api.get('/workers', { params: { limit: 1 } }).then((r) => r.data),
  });
  const { data: sites } = useQuery({
    queryKey: ['onboarding-sites'],
    queryFn: () => api.get('/sites', { params: { limit: 1 } }).then((r) => r.data),
  });
  const { data: workTypes } = useQuery({
    queryKey: ['onboarding-worktypes'],
    queryFn: () => api.get('/work-types', { params: { limit: 1 } }).then((r) => r.data),
  });
  const { data: submissions } = useQuery({
    queryKey: ['onboarding-submissions'],
    queryFn: () => api.get('/submissions', { params: { limit: 1 } }).then((r) => r.data),
  });

  if (dismissed) return null;

  const hasWorker = (workers?.pagination?.total ?? 0) > 0;
  const hasSite = (sites?.pagination?.total ?? 0) > 0;
  const hasWorkType = (workTypes?.pagination?.total ?? 0) > 0;
  const hasSubmission = (submissions?.pagination?.total ?? 0) > 0;

  const checks: CheckItem[] = [
    {
      id: 'site',
      label: 'Create your first site',
      description: 'A site is the physical location where your workers operate.',
      href: '/sites',
      done: hasSite,
    },
    {
      id: 'worktype',
      label: 'Add a work type',
      description: 'Work types define what tasks workers can submit (e.g. Cleaning, Inspection).',
      href: '/sites',
      done: hasWorkType,
    },
    {
      id: 'worker',
      label: 'Add your first worker',
      description: 'Workers use the mobile app to submit photo proof-of-work.',
      href: '/workers',
      done: hasWorker,
    },
    {
      id: 'submission',
      label: 'Receive your first submission',
      description: 'Share the mobile app link with a worker and ask them to submit.',
      href: '/gallery',
      done: hasSubmission,
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const allDone = completedCount === checks.length;
  const progressPct = Math.round((completedCount / checks.length) * 100);

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary-50 to-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary-100">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {allDone ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <div className="relative h-6 w-6">
                <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                  <circle
                    cx="12" cy="12" r="10" fill="none"
                    stroke="#4f46e5" strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 10}`}
                    strokeDashoffset={`${2 * Math.PI * 10 * (1 - progressPct / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-700">
                  {completedCount}/{checks.length}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {allDone ? '🎉 Setup complete!' : 'Get started with Prooftrail'}
            </p>
            <p className="text-xs text-gray-500">
              {allDone
                ? 'You\'re all set. You can dismiss this.'
                : `${completedCount} of ${checks.length} steps completed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
            onClick={() => { localStorage.setItem(DISMISSED_KEY, '1'); setDismissed(true); }}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-gray-100">
          {checks.map((item) => (
            <Link
              key={item.id}
              href={item.done ? '#' : item.href}
              className={`flex items-start gap-4 px-5 py-3.5 transition-colors ${
                item.done ? 'opacity-60 cursor-default' : 'hover:bg-primary-50/50 group'
              }`}
              onClick={item.done ? (e) => e.preventDefault() : undefined}
            >
              <div className="mt-0.5 shrink-0">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 group-hover:text-primary-400 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                )}
              </div>
              {!item.done && (
                <span className="shrink-0 text-xs font-semibold text-primary-600 group-hover:underline mt-0.5">
                  Go →
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
