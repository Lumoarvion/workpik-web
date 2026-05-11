'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getUser, setUser as setStoredUser } from '@/lib/auth';

const TRADES = [
  'Concrete', 'Masonry', 'Woodwork', 'Electrical', 'Plumbing',
  'Roofing', 'Drainage', 'Painting', 'Steel / Structural', 'General',
];

const BILLING_UNITS = [
  { value: 'm',   label: 'm — metres' },
  { value: 'm²',  label: 'm² — sq. metres' },
  { value: 'm³',  label: 'm³ — cubic metres' },
  { value: 'no.', label: 'no. — numbers' },
  { value: 't',   label: 't — tonnes' },
  { value: 'kg',  label: 'kg — kilograms' },
  { value: 'ls',  label: 'ls — lump sum' },
  { value: 'hr',  label: 'hr — hours' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('company');
  const [user, setUser] = useState<any>(null);

  useEffect(() => { setUser(getUser()); }, []);

  // ---- Queries ----
  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get('/company').then((r) => r.data),
  });

  const { data: workTypes } = useQuery({
    queryKey: ['work-types'],
    queryFn: () => api.get('/work-types').then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users', { params: { limit: 50 } }).then((r) => r.data),
    enabled: user?.role === 'ADMIN',
  });

  // ---- Company Tab State ----
  const [companyForm, setCompanyForm] = useState<any>({});
  useEffect(() => {
    if (company) setCompanyForm({ name: company.name, address: company.address || '', phone: company.phone || '', email: company.email || '', gstNumber: company.gstNumber || '' });
  }, [company]);

  const updateCompany = useMutation({
    mutationFn: (data: any) => api.put('/company', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['company'] }); toast.success('Company updated'); },
    onError: () => { toast.error('Failed to update company'); },
  });

  // ---- Sector State ----
  const [selectedSector, setSelectedSector] = useState('');
  const { data: sectorTemplates } = useQuery({
    queryKey: ['sector-templates'],
    queryFn: () => api.get('/company/sector-templates').then((r) => r.data),
  });

  useEffect(() => {
    if (company?.settings && (company.settings as any).sector) {
      setSelectedSector((company.settings as any).sector);
    }
  }, [company]);

  const updateSector = useMutation({
    mutationFn: (sector: string) => api.put('/company/sector', { sector }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Sector updated');
    },
    onError: () => toast.error('Failed to update sector'),
  });

  // ---- Work Types Tab State ----
  const [showAddWorkType, setShowAddWorkType] = useState(false);
  const [newWorkType, setNewWorkType] = useState({ name: '', icon: '', trade: '', billingUnit: '' });
  const [editingWorkTypeId, setEditingWorkTypeId] = useState<string | null>(null);
  const [editWorkTypeForm, setEditWorkTypeForm] = useState({ name: '', icon: '', trade: '', billingUnit: '' });
  const [editingFieldsForId, setEditingFieldsForId] = useState<string | null>(null);
  const [customFieldsForm, setCustomFieldsForm] = useState<any[]>([]);
  const [editingStepsForId, setEditingStepsForId] = useState<string | null>(null);
  const [photoStepsForm, setPhotoStepsForm] = useState<any[]>([]);

  const createWorkType = useMutation({
    mutationFn: (data: { name: string; icon: string; trade?: string; billingUnit?: string }) => api.post('/work-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-types'] });
      toast.success('Work type created');
      setNewWorkType({ name: '', icon: '', trade: '', billingUnit: '' });
      setShowAddWorkType(false);
    },
    onError: () => { toast.error('Failed to create work type'); },
  });

  const updateWorkType = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; icon?: string; trade?: string; billingUnit?: string } }) => api.put(`/work-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-types'] });
      toast.success('Work type updated');
      setEditingWorkTypeId(null);
    },
    onError: () => { toast.error('Failed to update work type'); },
  });

  const deleteWorkType = useMutation({
    mutationFn: (id: string) => api.delete(`/work-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-types'] });
      toast.success('Work type deleted');
    },
    onError: () => { toast.error('Cannot delete work type (may be in use)'); },
  });

  const updateCustomFields = useMutation({
    mutationFn: ({ id, customFields }: { id: string; customFields: any[] }) =>
      api.put(`/work-types/${id}/custom-fields`, { customFields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-types'] });
      toast.success('Custom fields saved');
      setEditingFieldsForId(null);
    },
    onError: () => toast.error('Failed to save custom fields'),
  });

  const addCustomField = () => {
    setCustomFieldsForm([
      ...customFieldsForm,
      { id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: '', type: 'text', required: false, options: [] },
    ]);
  };

  const removeCustomField = (index: number) => {
    setCustomFieldsForm(customFieldsForm.filter((_, i) => i !== index));
  };

  const updateFieldAt = (index: number, updates: any) => {
    setCustomFieldsForm(customFieldsForm.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const loadSuggestedFields = (workTypeName: string) => {
    const template = sectorTemplates?.find((t: any) => t.id === selectedSector);
    if (!template) return;
    const wtTemplate = template.workTypes.find((wt: any) =>
      wt.name.toLowerCase() === workTypeName.toLowerCase()
    );
    if (wtTemplate) {
      const fields = wtTemplate.suggestedFields.map((f: any, i: number) => ({
        ...f,
        id: `field_${Date.now()}_${i}`,
        options: f.options || [],
      }));
      setCustomFieldsForm(fields);
      toast.success(`Loaded ${fields.length} suggested fields`);
    } else {
      toast.error('No template found for this work type name');
    }
  };

  const updatePhotoSteps = useMutation({
    mutationFn: ({ id, photoSteps }: { id: string; photoSteps: any[] }) =>
      api.put(`/work-types/${id}/photo-steps`, { photoSteps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-types'] });
      toast.success('Photo steps saved');
      setEditingStepsForId(null);
    },
    onError: () => toast.error('Failed to save photo steps'),
  });

  const addPhotoStep = () => {
    setPhotoStepsForm([
      ...photoStepsForm,
      { id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: '', description: '', required: true, sortOrder: photoStepsForm.length },
    ]);
  };

  const removePhotoStep = (index: number) => {
    setPhotoStepsForm(photoStepsForm.filter((_, i) => i !== index).map((s, i) => ({ ...s, sortOrder: i })));
  };

  const updateStepAt = (index: number, updates: any) => {
    setPhotoStepsForm(photoStepsForm.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  // ---- Users Tab State ----
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ fullName: '', email: '', password: '', phone: '', role: 'MANAGER' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserRole, setEditUserRole] = useState('');

  const createUser = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setNewUserForm({ fullName: '', email: '', password: '', phone: '', role: 'MANAGER' });
      setShowAddUser(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to create user';
      toast.error(msg);
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      setEditingUserId(null);
    },
    onError: () => { toast.error('Failed to update user'); },
  });

  const toggleUserActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!isActive) {
        // Deactivate via DELETE
        return api.delete(`/users/${id}`);
      }
      // Reactivate via PUT
      return api.put(`/users/${id}`, { isActive: true });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(variables.isActive ? 'User activated' : 'User deactivated');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to update user status';
      toast.error(msg);
    },
  });

  // ---- Profile Tab State ----
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) setProfileForm({ fullName: user.fullName || '', phone: user.phone || '' });
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: (data: { fullName: string; phone: string }) => api.put(`/users/${user.id}`, data),
    onSuccess: (res) => {
      const updated = res.data;
      // Update stored user in localStorage
      const current = getUser();
      if (current) {
        const merged = { ...current, fullName: updated.fullName, phone: updated.phone };
        setStoredUser(merged);
        setUser(merged);
      }
      toast.success('Profile updated');
    },
    onError: () => { toast.error('Failed to update profile'); },
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => api.put('/users/me/password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to change password';
      toast.error(msg);
    },
  });

  const handlePasswordSubmit = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    changePassword.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const tabs = user?.role === 'ADMIN'
    ? ['company', 'work-types', 'users', 'profile']
    : ['profile'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* ============ COMPANY TAB ============ */}
      {activeTab === 'company' && (
        <Card>
          <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <Input value={companyForm.name || ''} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <Input value={companyForm.address || ''} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input value={companyForm.phone || ''} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input value={companyForm.email || ''} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">GST Number</label>
                <Input value={companyForm.gstNumber || ''} onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })} />
              </div>
              <Button onClick={() => updateCompany.mutate(companyForm)} disabled={updateCompany.isPending}>
                {updateCompany.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ WORK TYPES TAB ============ */}
      {activeTab === 'work-types' && (
        <div className="space-y-6">
          {/* Sector Selector */}
          <Card>
            <CardHeader><CardTitle>Industry Sector</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">Select your industry to get suggested work types and custom fields</p>
              <div className="flex items-end gap-3 max-w-lg">
                <div className="flex-1">
                  <Select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    options={[
                      { value: '', label: 'Select a sector...' },
                      ...(sectorTemplates?.map((t: any) => ({ value: t.id, label: t.name })) || []),
                    ]}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (selectedSector) updateSector.mutate(selectedSector);
                  }}
                  disabled={!selectedSector || updateSector.isPending}
                >
                  {updateSector.isPending ? 'Saving...' : 'Save Sector'}
                </Button>
              </div>
              {selectedSector && sectorTemplates && (
                <p className="text-xs text-gray-400 mt-2">
                  {sectorTemplates.find((t: any) => t.id === selectedSector)?.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Work Types */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Work Types</CardTitle>
              <Button onClick={() => setShowAddWorkType(!showAddWorkType)}>
                {showAddWorkType ? 'Cancel' : 'Add Work Type'}
              </Button>
            </CardHeader>
            <CardContent>
              {showAddWorkType && (
                <div className="mb-6 p-4 rounded-lg border bg-gray-50 space-y-3">
                  <div className="flex items-end gap-3">
                    <div className="w-20">
                      <label className="text-sm font-medium text-gray-700">Icon</label>
                      <Input
                        value={newWorkType.icon}
                        onChange={(e) => setNewWorkType({ ...newWorkType, icon: e.target.value })}
                        placeholder="📋"
                        maxLength={10}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        value={newWorkType.name}
                        onChange={(e) => setNewWorkType({ ...newWorkType, name: e.target.value })}
                        placeholder="e.g. Brick Masonry"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Trade</label>
                      <Select
                        value={newWorkType.trade}
                        onChange={(e) => setNewWorkType({ ...newWorkType, trade: e.target.value })}
                        options={[
                          { value: '', label: 'Select trade...' },
                          ...TRADES.map((t) => ({ value: t, label: t })),
                        ]}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Billing Unit</label>
                      <Select
                        value={newWorkType.billingUnit}
                        onChange={(e) => setNewWorkType({ ...newWorkType, billingUnit: e.target.value })}
                        options={[
                          { value: '', label: 'Select unit...' },
                          ...BILLING_UNITS.map((u) => ({ value: u.value, label: u.label })),
                        ]}
                      />
                    </div>
                    <Button
                      onClick={() => createWorkType.mutate({
                        ...newWorkType,
                        trade: newWorkType.trade || undefined,
                        billingUnit: newWorkType.billingUnit || undefined,
                      })}
                      disabled={!newWorkType.name || createWorkType.isPending}
                    >
                      {createWorkType.isPending ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {workTypes?.map((wt: any) => (
                  <div key={wt.id} className="rounded-lg border">
                    <div className="flex items-center justify-between p-3">
                      {editingWorkTypeId === wt.id ? (
                        <div className="flex flex-col gap-2 flex-1 py-1">
                          <div className="flex items-center gap-3">
                            <Input
                              className="w-20"
                              value={editWorkTypeForm.icon}
                              onChange={(e) => setEditWorkTypeForm({ ...editWorkTypeForm, icon: e.target.value })}
                              maxLength={10}
                              placeholder="📋"
                            />
                            <Input
                              className="flex-1"
                              value={editWorkTypeForm.name}
                              onChange={(e) => setEditWorkTypeForm({ ...editWorkTypeForm, name: e.target.value })}
                              placeholder="Work type name"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Select
                                value={editWorkTypeForm.trade}
                                onChange={(e) => setEditWorkTypeForm({ ...editWorkTypeForm, trade: e.target.value })}
                                options={[
                                  { value: '', label: 'No trade' },
                                  ...TRADES.map((t) => ({ value: t, label: t })),
                                ]}
                              />
                            </div>
                            <div className="flex-1">
                              <Select
                                value={editWorkTypeForm.billingUnit}
                                onChange={(e) => setEditWorkTypeForm({ ...editWorkTypeForm, billingUnit: e.target.value })}
                                options={[
                                  { value: '', label: 'No unit' },
                                  ...BILLING_UNITS.map((u) => ({ value: u.value, label: u.label })),
                                ]}
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => updateWorkType.mutate({ id: wt.id, data: {
                                ...editWorkTypeForm,
                                trade: editWorkTypeForm.trade || undefined,
                                billingUnit: editWorkTypeForm.billingUnit || undefined,
                              }})}
                              disabled={!editWorkTypeForm.name || updateWorkType.isPending}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingWorkTypeId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{wt.icon || '📋'}</span>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{wt.name}</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {wt.trade && (
                                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                    {wt.trade}
                                  </span>
                                )}
                                {wt.billingUnit && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    {wt.billingUnit}
                                  </span>
                                )}
                                {wt.customFields && (wt.customFields as any[]).length > 0 && (
                                  <span className="text-xs text-gray-400">
                                    {(wt.customFields as any[]).length} field{(wt.customFields as any[]).length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {wt.photoSteps && (wt.photoSteps as any[]).length > 0 && (
                                  <span className="text-xs text-blue-400">
                                    {(wt.photoSteps as any[]).length} photo step{(wt.photoSteps as any[]).length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingStepsForId(null);
                                if (editingFieldsForId === wt.id) {
                                  setEditingFieldsForId(null);
                                } else {
                                  setEditingFieldsForId(wt.id);
                                  setCustomFieldsForm(wt.customFields || []);
                                }
                              }}
                            >
                              {editingFieldsForId === wt.id ? 'Hide Fields' : 'Custom Fields'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingFieldsForId(null);
                                if (editingStepsForId === wt.id) {
                                  setEditingStepsForId(null);
                                } else {
                                  setEditingStepsForId(wt.id);
                                  setPhotoStepsForm(wt.photoSteps || []);
                                }
                              }}
                            >
                              {editingStepsForId === wt.id ? 'Hide Steps' : 'Photo Steps'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingWorkTypeId(wt.id);
                                setEditWorkTypeForm({ name: wt.name, icon: wt.icon || '', trade: wt.trade || '', billingUnit: wt.billingUnit || '' });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm('Delete this work type? This cannot be undone.')) {
                                  deleteWorkType.mutate(wt.id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Custom Fields Builder */}
                    {editingFieldsForId === wt.id && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700">Custom Fields for &quot;{wt.name}&quot;</h4>
                          <div className="flex gap-2">
                            {selectedSector && (
                              <Button size="sm" variant="outline" onClick={() => loadSuggestedFields(wt.name)}>
                                Load Suggested
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={addCustomField}>
                              + Add Field
                            </Button>
                          </div>
                        </div>

                        {customFieldsForm.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No custom fields yet. Workers will only submit photos and notes.
                          </p>
                        )}

                        {customFieldsForm.map((field: any, idx: number) => (
                          <div key={field.id} className="rounded-lg border bg-white p-3 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-500">Label</label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateFieldAt(idx, { label: e.target.value })}
                                  placeholder="e.g. Floor Number"
                                />
                              </div>
                              <div className="w-40">
                                <label className="text-xs font-medium text-gray-500">Type</label>
                                <Select
                                  value={field.type}
                                  onChange={(e) => updateFieldAt(idx, { type: e.target.value })}
                                  options={[
                                    { value: 'text', label: 'Text' },
                                    { value: 'number', label: 'Number' },
                                    { value: 'textarea', label: 'Long Text' },
                                    { value: 'checkbox', label: 'Checkbox' },
                                    { value: 'select', label: 'Dropdown' },
                                    { value: 'checklist', label: 'Checklist' },
                                  ]}
                                />
                              </div>
                              <div className="flex items-end gap-2 pt-4">
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateFieldAt(idx, { required: e.target.checked })}
                                    className="rounded"
                                  />
                                  Required
                                </label>
                                <button
                                  onClick={() => removeCustomField(idx)}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            {/* Options for select/checklist */}
                            {(field.type === 'select' || field.type === 'checklist') && (
                              <div>
                                <label className="text-xs font-medium text-gray-500">Options (comma-separated)</label>
                                <Input
                                  value={(field.options || []).join(', ')}
                                  onChange={(e) => updateFieldAt(idx, {
                                    options: e.target.value.split(',').map((o: string) => o.trim()).filter(Boolean),
                                  })}
                                  placeholder="Option 1, Option 2, Option 3"
                                />
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingFieldsForId(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateCustomFields.mutate({ id: wt.id, customFields: customFieldsForm })}
                            disabled={updateCustomFields.isPending}
                          >
                            {updateCustomFields.isPending ? 'Saving...' : 'Save Custom Fields'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Photo Steps Builder */}
                    {editingStepsForId === wt.id && (
                      <div className="border-t bg-blue-50/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700">Photo Steps for &quot;{wt.name}&quot;</h4>
                          <Button size="sm" variant="outline" onClick={addPhotoStep}>
                            + Add Step
                          </Button>
                        </div>

                        {photoStepsForm.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No photo steps. Workers will use free-form photo capture.
                          </p>
                        )}

                        {photoStepsForm.map((step: any, idx: number) => (
                          <div key={step.id} className="rounded-lg border bg-white p-3 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-5">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-500">Step Label</label>
                                <Input
                                  value={step.label}
                                  onChange={(e) => updateStepAt(idx, { label: e.target.value })}
                                  placeholder="e.g. Arrival Photo"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-500">Description (optional)</label>
                                <Input
                                  value={step.description || ''}
                                  onChange={(e) => updateStepAt(idx, { description: e.target.value })}
                                  placeholder="e.g. Photo at customer doorstep"
                                />
                              </div>
                              <div className="flex items-end gap-2 pt-4">
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={step.required}
                                    onChange={(e) => updateStepAt(idx, { required: e.target.checked })}
                                    className="rounded"
                                  />
                                  Required
                                </label>
                                <button
                                  onClick={() => removePhotoStep(idx)}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingStepsForId(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updatePhotoSteps.mutate({ id: wt.id, photoSteps: photoStepsForm })}
                            disabled={updatePhotoSteps.isPending}
                          >
                            {updatePhotoSteps.isPending ? 'Saving...' : 'Save Photo Steps'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {workTypes?.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No work types yet. Add one above.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ USERS TAB ============ */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dashboard Users</CardTitle>
            <Button onClick={() => setShowAddUser(true)}>Add User</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.data?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value)}
                            options={[
                              { value: 'MANAGER', label: 'Manager' },
                              { value: 'CLIENT', label: 'Client' },
                            ]}
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateUser.mutate({ id: u.id, data: { role: editUserRole } })}
                            disabled={updateUser.isPending}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Badge variant={u.role === 'ADMIN' ? 'default' : u.role === 'MANAGER' ? 'secondary' : 'outline'}>
                          {u.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.isActive
                        ? <Badge variant="success">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role !== 'ADMIN' && editingUserId !== u.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditUserRole(u.role);
                            }}
                          >
                            Edit Role
                          </Button>
                        )}
                        {u.id !== user?.id && u.role !== 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={u.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                            onClick={() => toggleUserActive.mutate({ id: u.id, isActive: !u.isActive })}
                            disabled={toggleUserActive.isPending}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                options={[
                  { value: 'MANAGER', label: 'Manager' },
                  { value: 'CLIENT', label: 'Client' },
                ]}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button
                onClick={() => createUser.mutate(newUserForm)}
                disabled={!newUserForm.fullName || !newUserForm.email || !newUserForm.password || createUser.isPending}
              >
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ PROFILE TAB ============ */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input value={user?.email || ''} disabled />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <Input value={user?.role || ''} disabled />
                </div>
                <Button
                  onClick={() => updateProfile.mutate(profileForm)}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Password</label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={changePassword.isPending}
                >
                  {changePassword.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
