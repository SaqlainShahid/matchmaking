import React, { useState, useEffect } from 'react';
import { useProvider } from '../../contexts/ProviderContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const Settings = () => {
  const ctx = useProvider();
  const user = ctx?.user || null;
  const saveProfile = ctx?.saveProfile || (async () => {});
  const loadProvider = ctx?.loadProvider || (async () => {});
  const [form, setForm] = useState({
    displayName: '',
    companyName: '',
    serviceType: '',
    serviceArea: '',
    phoneNumber: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProvider().then(() => {
      setForm({
        displayName: user?.displayName || '',
        companyName: user?.companyName || '',
        serviceType: user?.serviceType || '',
        serviceArea: user?.serviceArea || '',
        phoneNumber: user?.phoneNumber || ''
      });
    }).catch(() => {});
  }, [loadProvider]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile(form);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Profile Settings</h2>
        <p className="text-gray-600 mt-2">Manage business info and notifications</p>
      </div>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-900">Business Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="border rounded-md p-2" name="displayName" placeholder="Full Name / Business Name" value={form.displayName} onChange={handleChange} />
              <input className="border rounded-md p-2" name="companyName" placeholder="Company Name" value={form.companyName} onChange={handleChange} />
              <input className="border rounded-md p-2" name="serviceType" placeholder="Service Category (e.g., plumbing)" value={form.serviceType} onChange={handleChange} />
              <input className="border rounded-md p-2" name="serviceArea" placeholder="Service Area (city or postal code)" value={form.serviceArea} onChange={handleChange} />
              <input className="border rounded-md p-2" name="phoneNumber" placeholder="Contact Phone" value={form.phoneNumber} onChange={handleChange} />
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;