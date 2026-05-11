'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Camera, MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SharedSubmissionPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/v1/submissions/share/${token}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setError('This share link is invalid.');
        else if (err.response?.status === 410) setError('This share link has expired.');
        else setError('Something went wrong.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasPhotoSteps = data.workType?.photoSteps?.length > 0 && data.photos?.some((p: any) => p.photoStepId);
  const photoSteps = hasPhotoSteps
    ? [...(data.workType.photoSteps as any[])].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.company?.logo ? (
              <img src={data.company.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                {data.company?.name?.[0] || 'W'}
              </div>
            )}
            <span className="font-semibold text-gray-900">{data.company?.name || 'WorkPik'}</span>
          </div>
          <span className="text-xs text-gray-400">Shared submission</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {data.workType?.icon && <span className="mr-1.5">{data.workType.icon}</span>}
            {data.workType?.name || 'Submission'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.worker?.name} &middot; {data.site?.name}
            {data.zone?.name && <> &middot; {data.zone.name}</>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(data.createdAt)}
          </p>
        </div>

        {/* Photo Steps Timeline */}
        {hasPhotoSteps ? (
          <div className="relative pl-7 space-y-4">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
            {photoSteps.map((step: any, idx: number) => {
              const photo = data.photos.find((p: any) => p.photoStepId === step.id);
              return (
                <div key={step.id} className="relative">
                  <div className={`absolute -left-7 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
                    photo ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                  }`}>
                    {photo ? (
                      <CheckCircle className="h-3 w-3 text-white" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">{idx + 1}</span>
                    )}
                  </div>
                  <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{step.label}</span>
                      {step.description && <span className="text-xs text-gray-500">{step.description}</span>}
                    </div>
                    {photo ? (
                      <div>
                        <img
                          src={photo.photoUrl || photo.thumbnailUrl}
                          alt={step.label}
                          className="w-full max-h-80 object-contain bg-gray-100"
                        />
                        <div className="px-3 py-2 flex items-center gap-4 text-xs text-gray-500 border-t">
                          {photo.capturedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{formatDateTime(photo.capturedAt)}
                            </span>
                          )}
                          {(photo.latitude || photo.longitude) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{photo.latitude?.toFixed(5)}, {photo.longitude?.toFixed(5)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-xs">
                        <Camera className="h-5 w-5 mx-auto mb-1" />
                        Skipped
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard photo grid */
          <div className={`grid gap-2 ${
            data.photos?.length === 1 ? 'grid-cols-1' :
            data.photos?.length === 2 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {data.photos?.map((photo: any, idx: number) => (
              <div key={photo.id || idx} className="rounded-xl overflow-hidden bg-white border shadow-sm">
                <img
                  src={photo.photoUrl || photo.thumbnailUrl}
                  alt={`Photo ${idx + 1}`}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* GPS Info */}
        {(data.latitude || data.longitude) && (
          <div className="rounded-xl border bg-white p-3 flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            {data.latitude?.toFixed(5)}, {data.longitude?.toFixed(5)}
          </div>
        )}

        {/* Note */}
        {data.note && (
          <div className="rounded-xl bg-white border p-3 text-sm">
            <p className="text-xs text-gray-500 mb-1 font-medium">Note</p>
            <p className="text-gray-700">{data.note}</p>
          </div>
        )}

        {/* Custom Data */}
        {data.customData && Object.keys(data.customData).length > 0 && (
          <div className="rounded-xl bg-white border p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Details</p>
            {data.workType?.customFields ? (
              (data.workType.customFields as any[]).map((field: any) => {
                const val = data.customData[field.id];
                if (val === undefined || val === '' || val === false) return null;
                const displayVal = typeof val === 'boolean' ? 'Yes' : Array.isArray(val) ? val.join(', ') : String(val);
                return (
                  <div key={field.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{field.label}</span>
                    <span className="font-medium text-gray-900">{displayVal}</span>
                  </div>
                );
              })
            ) : (
              Object.entries(data.customData).map(([key, val]: [string, any]) => {
                const displayVal = typeof val === 'boolean' ? 'Yes' : Array.isArray(val) ? val.join(', ') : String(val || '');
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
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          Powered by WorkPik
        </div>
      </div>
    </div>
  );
}
